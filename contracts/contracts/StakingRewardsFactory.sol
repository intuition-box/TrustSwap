// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakingRewards.sol";

/**
 * @title StakingRewardsFactoryV2
 */
contract StakingRewardsFactoryV2 {
    IERC20  public immutable rewardsToken; // TSWP
    address public owner;
    uint256 public defaultRewardsDuration; // ex: 864000 = 10j

    mapping(address => address) public stakingRewardsByStakingToken; // LP => SR
    address[] public allStakingRewards;

    event Created(address indexed stakingToken, address stakingRewards, address srOwner, address rewardsDistribution, uint256 duration);
    event OwnerUpdated(address indexed owner);
    event DefaultDurationUpdated(uint256 duration);

    modifier onlyOwner() {
        require(msg.sender == owner, "SRF: not owner");
        _;
    }

    constructor(address _rewardsToken, uint256 _defaultDuration) {
        rewardsToken = IERC20(_rewardsToken);
        owner = msg.sender;
        defaultRewardsDuration = _defaultDuration;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerUpdated(_owner);
    }

    function setDefaultRewardsDuration(uint256 _seconds) external onlyOwner {
        defaultRewardsDuration = _seconds;
        emit DefaultDurationUpdated(_seconds);
    }

    function create(address stakingToken, address rewardsDistribution, address srOwner)
        external
        onlyOwner
        returns (address stakingRewards)
    {
        require(stakingRewardsByStakingToken[stakingToken] == address(0), "SRF: exists");

        StakingRewards sr = new StakingRewards(
            rewardsDistribution,          // EOA qui notifie
            address(rewardsToken),
            stakingToken,
            defaultRewardsDuration
        );

        // 👇 Transfert d’ownership du SR vers l’EOA/multisig souhaité
        address newOwner = (srOwner == address(0)) ? owner : srOwner;
        sr.setOwner(newOwner);

        stakingRewards = address(sr);
        stakingRewardsByStakingToken[stakingToken] = stakingRewards;
        allStakingRewards.push(stakingRewards);

        emit Created(stakingToken, stakingRewards, newOwner, rewardsDistribution, defaultRewardsDuration);
    }

    function allStakingRewardsLength() external view returns (uint256) {
        return allStakingRewards.length;
    }

    // Helper pour corriger un SR si besoin
    function setSrOwner(address stakingToken, address newOwner) external onlyOwner {
        address sr = stakingRewardsByStakingToken[stakingToken];
        require(sr != address(0), "SRF: unknown stakingToken");
        StakingRewards(sr).setOwner(newOwner);
    }
}
