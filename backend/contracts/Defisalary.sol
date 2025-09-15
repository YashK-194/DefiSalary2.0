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
        uint id;
    }

    AggregatorV3Interface public priceFeed;
    Employee[] public employees;

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
        // 0x694AA1769357215DE4FAC081bf1f309aDC325306
    }

    receive() external payable {}

    fallback() external payable {}

    // Admin functions
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

        Employee memory newEmployee = Employee(
            _name,
            _walletAdd,
            true,
            _salaryUSD,
            block.timestamp,
            block.timestamp,
            employees.length
        );
        employees.push(newEmployee);
        emit EmployeeAdded(employees.length - 1, _name, _walletAdd, _salaryUSD);
        return employees.length - 1;
    }

    function removeEmployee(uint _id) external onlyOwner {
        require(_id < employees.length, "Id not valid");
        require(
            employees[_id].isActive == true,
            "Employee is already inactive"
        );

        Employee storage employee = employees[_id];
        employee.isActive = false;
        emit EmployeeRemoved(_id);
    }

    function updateEmployeeDetails(
        string memory _newName,
        address _newWallet,
        bool _isActive,
        uint _newSalaryUSD,
        uint _id
    ) external onlyOwner {
        require(_id < employees.length, "Id not valid");
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
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    function checkUpkeep(
        bytes memory
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint[] memory dueEmployees = new uint[](employees.length);
        uint count = 0;

        for (uint i = 0; i < employees.length; i++) {
            if (
                employees[i].isActive &&
                block.timestamp - employees[i].lastPaymentDate >= 30 days
            ) {
                dueEmployees[count] = i;
                count++;
            }
        }

        if (count > 0) {
            upkeepNeeded = true;
            bytes memory ids = abi.encode(dueEmployees, count);
            return (true, ids);
        }
        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint[] memory employeeIds, uint count) = abi.decode(
            performData,
            (uint[], uint)
        );
        for (uint i = 0; i < count; i++) {
            paySalary(employeeIds[i]);
        }
    }

    function paySalary(uint _id) internal onlyOwnerOrSelf {
        require(_id < employees.length, "Invalid ID");
        Employee storage employee = employees[_id];

        require(employee.isActive, "Employee inactive");
        require(
            block.timestamp - employee.lastPaymentDate >= 30 days,
            "Not eligible yet"
        );

        uint salaryEth = usdToEth(employee.salaryUSD);
        require(getContractBalance() >= salaryEth, "Insufficient funds");

        employee.lastPaymentDate = block.timestamp;

        (bool success, ) = payable(employee.walletAdd).call{value: salaryEth}(
            ""
        );
        require(success, "Payment failed");

        emit SalaryPaid(_id, employee.salaryUSD, salaryEth);
    }

    // View functions
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function getEmployeesCount() external view returns (uint) {
        return employees.length;
    }

    // USD to ETH conversion functions
    function getLatestETHPrice() public view returns (uint256) {
        (, int price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price data");
        return uint256(price) * 1e10; // Adjust precision to 18 decimal places. Chainlink price feeds return 8 decimal places
    }

    function usdToEth(uint _amountUSD) public view returns (uint) {
        uint256 adjustedUsd = _amountUSD * (1e18); // adjusting to 18 decimal places
        uint256 ethPrice = getLatestETHPrice();
        return (adjustedUsd * 1e18) / ethPrice; // multiplying again with 1e18 to get eth amount in wei
    }
}
