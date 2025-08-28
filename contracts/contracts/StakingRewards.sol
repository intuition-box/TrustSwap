// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingRewards (Uniswap/Synthetix-style)
 * - 1 contrat par pool LP
 * - Le distributeur appelle notifyRewardAmount(amount) (le contrat pull les TSWP via transferFrom)
 * - Reward stream linéaire sur rewardsDuration (ex. 15 min en testnet)
 */
contract StakingRewards is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardsToken;   // TSWP
    IERC20 public immutable stakingToken;   // LP token (UniswapV2Pair)

    address public owner;
    address public rewardsDistribution;     // autorisé à notifyRewardAmount

    uint256 public periodFinish;            // timestamp fin de période
    uint256 public rewardRate;              // TSWP / sec
    uint256 public rewardsDuration;         // durée du stream (ex. 900s)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /* ---------------------------- Events ---------------------------- */
    event OwnerUpdated(address indexed owner);
    event RewardsDistributionUpdated(address indexed distribution);
    event RewardsDurationUpdated(uint256 duration);
    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    /* --------------------------- Modifiers -------------------------- */
    modifier onlyOwner() {
        require(msg.sender == owner, "SR: not owner");
        _;
    }

    modifier onlyRewardsDistribution() {
        require(msg.sender == rewardsDistribution, "SR: not distributor");
        _;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* -------------------------- Constructor ------------------------- */
    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        uint256 _rewardsDuration
    ) {
        owner = msg.sender;
        rewardsDistribution = _rewardsDistribution;
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        rewardsDuration = _rewardsDuration;
    }

    /* -------------------------- Admin funcs ------------------------- */
    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
        emit OwnerUpdated(_owner);
    }

    function setRewardsDistribution(address _distribution) external onlyOwner {
        rewardsDistribution = _distribution;
        emit RewardsDistributionUpdated(_distribution);
    }

    // Se change uniquement hors période active (comme Synthetix)
    function setRewardsDuration(uint256 _duration) external onlyOwner {
        require(block.timestamp > periodFinish, "SR: ongoing period");
        rewardsDuration = _duration;
        emit RewardsDurationUpdated(_duration);
    }

    /* ---------------------------- Views ----------------------------- */
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view returns (uint256) { return _balances[account]; }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / _totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return ((_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18)
            + rewards[account];
    }

    /* --------------------------- User flow -------------------------- */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "SR: stake=0");
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "SR: withdraw=0");
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /* ----------------------- Rewards management --------------------- */
    // Le contrat pull les TSWP depuis rewardsDistribution (approve requis)
    function notifyRewardAmount(uint256 reward)
        external
        onlyRewardsDistribution
        updateReward(address(0))
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;

        // Pull des TSWP depuis le distributeur (ton EOA ou un coffre)
        rewardsToken.safeTransferFrom(msg.sender, address(this), reward);
        emit RewardAdded(reward);
    }
}
