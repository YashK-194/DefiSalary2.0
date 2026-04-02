// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Defisalary is Ownable, AutomationCompatibleInterface {
    struct Employee {
        string name;
        address walletAdd;
        bool isActive;
        uint salaryUSD;
        uint joiningDate;
        uint lastPaymentDate;
        uint nextPaymentDate;
        uint id;
    }

    AggregatorV3Interface public priceFeed;
    Employee[] public employees;

    uint public constant PAY_INTERVAL = 30 days;
    uint public constant MAX_BATCH_SIZE = 10;

    event EmployeeAdded(
        uint indexed id,
        string name,
        address walletAddress,
        uint salaryUSD
    );
    event EmployeeRemoved(uint indexed id);
    event EmployeeUpdated(
        uint indexed id,
        string name,
        bool isActive,
        address walletAddress,
        uint salaryUSD
    );
    event SalaryPaid(uint indexed id, uint amountUSD, uint amountEth);

    modifier onlyOwnerOrSelf() {
        require(
            msg.sender == owner() || msg.sender == address(this),
            "Not authorized"
        );
        _;
    }

    constructor(address _priceFeedAddress) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    receive() external payable {}
    fallback() external payable {}

    // ================= ADMIN =================

    function addEmployee(
        string memory _name,
        address _walletAdd,
        uint _salaryUSD
    ) external onlyOwner returns (uint) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(
            _walletAdd != address(0) && _walletAdd != address(this),
            "Invalid Address"
        );

        uint id = employees.length;

        Employee memory newEmployee = Employee({
            name: _name,
            walletAdd: _walletAdd,
            isActive: true,
            salaryUSD: _salaryUSD,
            joiningDate: block.timestamp,
            lastPaymentDate: block.timestamp,
            nextPaymentDate: block.timestamp + PAY_INTERVAL,
            id: id
        });

        employees.push(newEmployee);

        emit EmployeeAdded(id, _name, _walletAdd, _salaryUSD);
        return id;
    }

    function removeEmployee(uint _id) external onlyOwner {
        require(_id < employees.length, "Invalid ID");
        require(employees[_id].isActive, "Already inactive");

        employees[_id].isActive = false;
        emit EmployeeRemoved(_id);
    }

    function updateEmployeeDetails(
        string memory _newName,
        address _newWallet,
        bool _isActive,
        uint _newSalaryUSD,
        uint _id
    ) external onlyOwner {
        require(_id < employees.length, "Invalid ID");
        require(bytes(_newName).length > 0, "Name cannot be empty");
        require(
            _newWallet != address(0) && _newWallet != address(this),
            "Invalid Address"
        );

        Employee storage employee = employees[_id];
        employee.name = _newName;
        employee.walletAdd = _newWallet;
        employee.isActive = _isActive;
        employee.salaryUSD = _newSalaryUSD;

        emit EmployeeUpdated(
            _id,
            _newName,
            _isActive,
            _newWallet,
            _newSalaryUSD
        );
    }

    function changeOwner(address newOwner) external onlyOwner {
        transferOwnership(newOwner);
    }

    function withdrawFunds() external onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No funds");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    // ================= AUTOMATION =================

    function checkUpkeep(
        bytes memory
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint[] memory dueEmployees = new uint[](MAX_BATCH_SIZE);
        uint count = 0;

        for (uint i = 0; i < employees.length && count < MAX_BATCH_SIZE; i++) {
            if (
                employees[i].isActive &&
                block.timestamp >= employees[i].nextPaymentDate
            ) {
                dueEmployees[count] = i;
                count++;
            }
        }

        if (count > 0) {
            return (true, abi.encode(dueEmployees, count));
        }

        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint[] memory employeeIds, uint count) = abi.decode(
            performData,
            (uint[], uint)
        );

        for (uint i = 0; i < count; i++) {
            // try-catch prevents full revert
            try this.paySalary(employeeIds[i]) {} catch {}
        }
    }

    function paySalary(uint _id) external onlyOwnerOrSelf {
        require(_id < employees.length, "Invalid ID");

        Employee storage employee = employees[_id];

        if (
            !employee.isActive ||
            block.timestamp < employee.nextPaymentDate
        ) {
            return; // silently skip (important for automation)
        }

        uint salaryEth = usdToEth(employee.salaryUSD);
        require(getContractBalance() >= salaryEth, "Insufficient funds");

        employee.lastPaymentDate = block.timestamp;
        employee.nextPaymentDate += PAY_INTERVAL;

        (bool success, ) = payable(employee.walletAdd).call{value: salaryEth}(
            ""
        );
        require(success, "Payment failed");

        emit SalaryPaid(_id, employee.salaryUSD, salaryEth);
    }

    // ================= VIEW =================

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getEmployeesCount() external view returns (uint) {
        return employees.length;
    }

    // ================= PRICE =================

    function getLatestETHPrice() public view returns (uint256) {
        (, int price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return uint256(price) * 1e10; // 8 → 18 decimals
    }

    function usdToEth(uint _amountUSD) public view returns (uint) {
        uint256 adjustedUsd = _amountUSD * 1e18;
        uint256 ethPrice = getLatestETHPrice();

        return (adjustedUsd * 1e18) / ethPrice;
    }
}