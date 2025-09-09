// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Multicall3 — complète & compatible viem/wagmi
/// @notice Batch d'appels on-chain avec options de tolérance d'échec, et helpers de contexte bloc.
///         Implémente: aggregate, tryAggregate, blockAndAggregate, tryBlockAndAggregate,
///         aggregate3, aggregate3Value, et de nombreux getters (balance, basefee, coinbase, etc.).
contract Multicall3 {
    // ======== Types ========

    struct Call {
        address target;
        bytes callData;
    }

    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Call3Value {
        address target;
        bool allowFailure;
        uint256 value;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    // ======== Multicalls “classiques” ========

    /// @notice Exécute une liste d'appels. Revert si un call revert.
    /// @return blockNumber Numéro de bloc courant
    /// @return returnData Liste des retours encodés
    function aggregate(Call[] calldata calls)
        external
        payable
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        uint256 length = calls.length;
        returnData = new bytes[](length);

        for (uint256 i = 0; i < length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, _revertReason(ret));
            returnData[i] = ret;
        }
    }

    /// @notice Exécute des appels avec option requireSuccess globale.
    /// @param requireSuccess Si true, revert si un call échoue.
    function tryAggregate(bool requireSuccess, Call[] calldata calls)
        external
        payable
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            if (requireSuccess) {
                if (!success) revert(_revertReason(ret));
            }
            returnData[i] = Result({ success: success, returnData: ret });
        }
    }

    /// @notice Retourne blockNumber, blockHash, et retours (revert si un call échoue).
    function blockAndAggregate(Call[] calldata calls)
        external
        payable
        returns (uint256 blockNumber, bytes32 blockHash, bytes[] memory returnData)
    {
        blockNumber = block.number;
        blockHash = blockhash(block.number - 1);
        uint256 length = calls.length;
        returnData = new bytes[](length);

        for (uint256 i = 0; i < length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, _revertReason(ret));
            returnData[i] = ret;
        }
    }

    /// @notice Variante de blockAndAggregate avec flag requireSuccess.
    function tryBlockAndAggregate(bool requireSuccess, Call[] calldata calls)
        external
        payable
        returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData)
    {
        blockNumber = block.number;
        blockHash = blockhash(block.number - 1);
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            if (requireSuccess) {
                if (!success) revert(_revertReason(ret));
            }
            returnData[i] = Result({ success: success, returnData: ret });
        }
    }

    // ======== Multicalls “v3” (use by viem) ========

    /// @notice Batch without value, with allowFailure to call.
    function aggregate3(Call3[] calldata calls)
        external
        payable
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            if (!success && !calls[i].allowFailure) {
                revert(_revertReason(ret));
            }
            returnData[i] = Result({ success: success, returnData: ret });
        }
    }

    /// @notice Batch with send value, allowFailure to call.
    function aggregate3Value(Call3Value[] calldata calls)
        external
        payable
        returns (Result[] memory returnData)
    {
        uint256 length = calls.length;
        returnData = new Result[](length);
        uint256 sent;

        for (uint256 i = 0; i < length; i++) {
            sent += calls[i].value;
            (bool success, bytes memory ret) =
                calls[i].target.call{ value: calls[i].value }(calls[i].callData);
            if (!success && !calls[i].allowFailure) {
                revert(_revertReason(ret));
            }
            returnData[i] = Result({ success: success, returnData: ret });
        }
        require(sent == msg.value, "Multicall3: msg.value mismatch");
    }

    // ======== Helpers “read chain” ========

    function getBlockHash(uint256 blockNumber) external view returns (bytes32) {
        return blockhash(blockNumber);
    }

    function getLastBlockHash() external view returns (bytes32) {
        return blockhash(block.number - 1);
    }

    function getCurrentBlockTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    /// @dev post-merge, `block.prevrandao` replace `block.difficulty`.
    function getCurrentBlockDifficulty() external view returns (uint256) {
        // Solidity >=0.8.18 expose `block.prevrandao`.
        return block.prevrandao;
    }

    function getCurrentBlockGasLimit() external view returns (uint256) {
        return block.gaslimit;
    }

    function getCurrentBlockBaseFee() external view returns (uint256) {
        return block.basefee;
    }

    function getCurrentBlockCoinbase() external view returns (address) {
        return block.coinbase;
    }

    function getBlockNumber() external view returns (uint256) {
        return block.number;
    }

    function getChainId() external view returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    function getEthBalance(address addr) external view returns (uint256) {
        return addr.balance;
    }

    // ======== Utils ========

    receive() external payable {}

    function _revertReason(bytes memory ret) private pure returns (string memory) {
        if (ret.length < 68) return "Multicall3: call failed";
        // Strip the selector.
        assembly {
            ret := add(ret, 0x04)
        }
        return abi.decode(ret, (string));
    }
}
