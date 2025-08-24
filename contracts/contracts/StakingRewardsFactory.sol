// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakingRewards.sol";

/**
 * @title StakingRewardsFactory
 * - Déploie 1 StakingRewards par LP
 * - Garde la liste pour l'UI
 * - defaultRewardsDuration modifiable
 */
contract StakingRewardsFactory {
    IERC20  public immutable rewardsToken;       // TSWP
    address public owner;
    uint256 public defaultRewardsDuration;       // ex. 900 (15 min testnet)

    mapping(address => address) public stakingRewardsByStakingToken; // LP => SR
    address[] public allStakingRewards;

    event Created(address indexed stakingToken, address stakingRewards);
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

    function create(address stakingToken, address rewardsDistribution)
        external
        onlyOwner
        returns (address stakingRewards)
    {
        require(stakingRewardsByStakingToken[stakingToken] == address(0), "SRF: exists");
        StakingRewards sr = new StakingRewards(
            rewardsDistribution,          // EOA qui notifie (toi au début)
            address(rewardsToken),
            stakingToken,
            defaultRewardsDuration
        );
        stakingRewards = address(sr);
        stakingRewardsByStakingToken[stakingToken] = stakingRewards;
        allStakingRewards.push(stakingRewards);
        emit Created(stakingToken, stakingRewards);
    }

    function allStakingRewardsLength() external view returns (uint256) {
        return allStakingRewards.length;
    }
}
