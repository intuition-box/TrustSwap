// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.20;

contract WTTRUST {
    string public name     = "Wrapped tTRUST";
    string public symbol   = "WTTRUST";
    uint8  public constant decimals = 18;

    event  Approval(address indexed owner, address indexed spender, uint value);
    event  Transfer(address indexed from, address indexed to, uint value);
    event  Deposit(address indexed to, uint value);
    event  Withdrawal(address indexed from, uint value);

    mapping (address => uint) public balanceOf;
    mapping (address => mapping (address => uint)) public allowance;

    // receive tTRUST and wrap
    receive() external payable { deposit(); }
    fallback() external payable { deposit(); }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
        emit Transfer(address(0), msg.sender, msg.value);
    }

    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad, "WTTRUST: insufficient");
        balanceOf[msg.sender] -= wad;
        emit Withdrawal(msg.sender, wad);
        emit Transfer(msg.sender, address(0), wad);
        (bool ok, ) = msg.sender.call{value: wad}("");
        require(ok, "WTTRUST: withdraw failed");
    }

    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    function approve(address spender, uint value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) public returns (bool) {
        return transferFrom(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint value) public returns (bool) {
        require(balanceOf[from] >= value, "WTTRUST: balance");
        if (from != msg.sender && allowance[from][msg.sender] != type(uint).max) {
            require(allowance[from][msg.sender] >= value, "WTTRUST: allowance");
            allowance[from][msg.sender] -= value;
        }
        balanceOf[from] -= value;
        balanceOf[to]   += value;
        emit Transfer(from, to, value);
        return true;
    }
}
