const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMarketplace", function () {
  
  let nftMarketplace;
  let myToken;
  let owner, signer1, signer2, signer3;

  before(async function(){

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace")
    nftMarketplace = await NFTMarketplace.deploy();
    
    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy();

    [owner, signer1, signer2, signer3] = await ethers.getSigners()

  })

  describe("List", function(){

    it("should revert if collection address is zero", async function(){
      await expect(nftMarketplace.list(1, ethers.constants.AddressZero, 0))
      .to.be.revertedWith("Invalid Collection!");
    })

    it("should revert if msg.sender not equal with owner", async function(){
      console.log("CollectionAddress:", myToken.address)
      console.log("Owner:", owner.address)
      await myToken.safeMint(owner.address)
      await expect(nftMarketplace.connect(signer1).list(0, myToken.address, 1))
      .to.be.revertedWith("Invalid Owner!")
    })

    it("should revert if minBid is less or than equal zero", async function(){
      await expect(nftMarketplace.connect(owner).list(0, myToken.address, 0))
      .to.be.revertedWith("Invalid Min Bid!")
    })

    it("should list successfuly", async function(){
      // const timeStamp = Math.round(Date.now() / 1000)
      await expect(nftMarketplace.connect(owner).list(0, myToken.address, ethers.utils.parseEther("1.0")))
      .to.emit(nftMarketplace, 'List')
      .withArgs(owner.address, 0, myToken.address, ethers.utils.parseEther("1.0"))

      // testing list with take parametres of list
      const listItem = await nftMarketplace.lists(myToken.address, 0)
      expect(listItem).to.deep
      .equal([owner.address, "0", myToken.address,
       ethers.utils.parseEther("1.0"), [ethers.constants.AddressZero, "0"]])
    })

  })

  describe("Bid", function(){

    it("should revert if price is less than min bid and price is less old bid", async function(){
      await expect(nftMarketplace.bid(await myToken.address, 0, 1)).to.be.revertedWith("Invalid Price!")
    })

    it("should revert if price is less than value!", async function(){
      await expect(nftMarketplace.connect(signer1).bid(await myToken.address, 0, 
      ethers.utils.parseEther("2.0"), 
      {value: ethers.utils.parseEther("1.0")})).to.be.revertedWith("Invalid Value!")
    })

    it("should bid successfully", async function(){
      await expect(nftMarketplace.connect(signer1).bid(await myToken.address, 0, ethers.utils.parseEther("2.0"),
      {value: ethers.utils.parseEther("2.0")}))
      .to.emit(nftMarketplace, 'Bid')
      .withArgs(signer1.address, await myToken.address, 0, ethers.utils.parseEther("2.0"))

      // testing list with take parametres of list
      const listItem = await nftMarketplace.lists(await myToken.address, 0)
      expect(listItem).to.deep.equal(
        [owner.address, "0", await myToken.address, ethers.utils.parseEther("1.0"), 
        [signer1.address, ethers.utils.parseEther("2.0")]])
    })

    it("should send value successful", async function(){
      const oldValueBidder = await ethers.provider.getBalance(signer1.address)
      await nftMarketplace.connect(signer2).bid(await myToken.address, 0, ethers.utils.parseEther("3.0"),
      {value: ethers.utils.parseEther("3.0")})
      expect(await ethers.provider.getBalance(signer1.address)).to.be.equal(oldValueBidder.add(ethers.utils.parseEther("2.0")))
    })

  })

  describe("AcceptBid", function(){

    it("should revert if price is less and equal than zero", async function(){
      await myToken.safeMint(signer3.address)
      await nftMarketplace.connect(signer3).list(1, await myToken.address, 1)
      await expect(nftMarketplace.connect(signer2).acceptBid(await myToken.address, 1))
      .to.be.revertedWith("Not Exist!")
    })

    it("should transfer price to owner successful and changed owner and delete token0 from lists", async function(){
      //  approved token 0 to nftMarketplace
      await myToken.connect(owner).approve(await nftMarketplace.address, 0)
      
      const oldValueOwner = await ethers.provider.getBalance(owner.address)
      const listItem = await nftMarketplace.lists(await myToken.address, 0)
      const tx = nftMarketplace.connect(owner).acceptBid(await myToken.address, 0)

      // should AcceptBid successfully
      await expect(tx).to.emit(nftMarketplace, 'AcceptBid')
      .withArgs(owner.address ,signer2.address, await myToken.address, 0, ethers.utils.parseEther("3.0"))

      // Transfer price to owner successful
      const newValueOwner = await ethers.provider.getBalance(owner.address)
      const gasUsed = ethers.utils.parseEther("3.0").sub(newValueOwner.sub(oldValueOwner))
      expect(newValueOwner).to.equal(oldValueOwner.add(listItem[4][1].sub(gasUsed)))

      // Changed owner
      const newOwner = await myToken.ownerOf(0)
      expect(newOwner).to.be.equal(await signer2.address)

      // Delete token0 from lists
      expect((await nftMarketplace.lists(await myToken.address, 0))[0])
      .to.be.equal(ethers.constants.AddressZero)
    })

  })

})
