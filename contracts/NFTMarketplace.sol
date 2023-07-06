
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NFTMarketplace {

    event List(address owner, uint tockenId, address collectionAddress, uint minBid);
    event Bid(address bidder, address collectionAddress, uint tockenId, uint price);
    event AcceptBid(address oldOwner,address newOwner,address collectionAddress,uint tockenId,uint price);

    struct BidItem {
        address bidder;
        uint price;
    }

    struct ListItem {
        address owner;
        uint tockenId;
        address collectionAddress;
        uint minBid;
        // uint date;
        BidItem bid;
    }

    mapping (address => mapping (uint => ListItem)) public lists;

    function list(uint tockenId, address collectionAddress, uint minBid) public {

        require(collectionAddress != address(0), "Invalid Collection!");

        address owner = IERC721(collectionAddress).ownerOf(tockenId);
        require(msg.sender == owner, "Invalid Owner!");

        require(minBid > 0, "Invalid Min Bid!");

        lists[collectionAddress][tockenId] = ListItem({
            owner: msg.sender,
            tockenId: tockenId,
            collectionAddress: collectionAddress,
            minBid: minBid,
            // date: block.timestamp,
            bid: BidItem({
                bidder: address(0),
                price: 0
            })
        });

        emit List(msg.sender, tockenId, collectionAddress, minBid);
    }

    function bid(address collectionAddress, uint tockenId, uint price) public payable {

        ListItem storage listItem  =  lists[collectionAddress][tockenId];

        require(
            price > listItem.minBid 
            && price > listItem.bid.price, "Invalid Price!");

        require(msg.value >= price, "Invalid Value!");

        if(listItem.bid.price > 0){

            (bool success, ) = listItem.bid.bidder
            .call{value: listItem.bid.price}
            ("");

            require(success, "Refound Bidder failed!"); 

        }       

        listItem.bid = BidItem({
            bidder: msg.sender,
            price: price
        });

        emit Bid(msg.sender, collectionAddress, tockenId, price);
    }

    function acceptBid(address collectionAddress, uint tockenId) public {

        BidItem memory bidItem = lists[collectionAddress][tockenId].bid;

        require(bidItem.price > 0, "Not Exist!");

        IERC721(collectionAddress)
        .safeTransferFrom(msg.sender,bidItem.bidder, tockenId);

        (bool success, ) = msg.sender.call{value: bidItem.price}("");
        require(success, "Send ETH failed");  

        delete lists[collectionAddress][tockenId];

        emit AcceptBid(msg.sender, bidItem.bidder, collectionAddress, tockenId, bidItem.price);
    }
}
