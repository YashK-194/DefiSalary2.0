const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Defisalary", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDefisalaryFixture() {
    const ONE_MONTH_IN_SECS = 30 * 24 * 60 * 60;

    const [owner, employee, employee2] = await ethers.getSigners();

    const ETH_USD_PRICE = ethers.parseUnits("2000", 8); // $2000 per ETH

    const MockV3Aggregator = await ethers.getContractFactory(
      "MockV3Aggregator"
    );
    const mockFeed = await MockV3Aggregator.deploy(8, ETH_USD_PRICE);
    await mockFeed.waitForDeployment();

    const Defisalary = await ethers.getContractFactory("Defisalary");
    const defisalary = await Defisalary.deploy(await mockFeed.getAddress());

    return {
      defisalary,
      ONE_MONTH_IN_SECS,
      ETH_USD_PRICE,
      mockFeed,
      owner,
      employee,
      employee2,
    };
  }

  describe("Deployment", function () {
    it("sets the priceFeed correctly", async function () {
      const { defisalary, mockFeed } = await loadFixture(
        deployDefisalaryFixture
      );

      expect(await defisalary.priceFeed()).to.equal(
        await mockFeed.getAddress()
      );
    });

    it("Should set the right owner", async function () {
      const { defisalary, owner } = await loadFixture(deployDefisalaryFixture);

      expect(await defisalary.owner()).to.equal(owner.address);
    });
  });

  describe("Employees", function () {
    it("Should set employee details correctly", async function () {
      const { defisalary, employee } = await loadFixture(
        deployDefisalaryFixture
      );
      const joiningTime = 2_000_000_000;

      // Set the next block’s timestamp
      await ethers.provider.send("evm_setNextBlockTimestamp", [joiningTime]);
      // await ethers.provider.send("evm_mine", []); // mine a block
      await defisalary.addEmployee("Tester", employee.address, 1000);

      const newEmployee = await defisalary.employees(0);

      expect(newEmployee.name).to.equal("Tester");
      expect(newEmployee.walletAdd).to.equal(employee.address);
      expect(newEmployee.isActive).to.equal(true);
      expect(newEmployee.salaryUSD).to.equal(1000);
      expect(newEmployee.joiningDate).to.equal(joiningTime);
      expect(newEmployee.lastPaymentDate).to.equal(joiningTime);
      expect(newEmployee.id).to.equal(0);
      expect(await defisalary.getEmployeesCount()).to.equal(1);
    });

    it("Should remove employees correctly", async function () {
      const { defisalary, employee } = await loadFixture(
        deployDefisalaryFixture
      );
      await defisalary.addEmployee("Tester", employee.address, 1000);
      await defisalary.removeEmployee(0);
      const newEmployee = await defisalary.employees(0);

      expect(await newEmployee.isActive).to.equal(false);
    });

    it("Should update employee details correctly", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );
      const joiningTime = 2_000_000_000;

      // Set the next block’s timestamp
      await ethers.provider.send("evm_setNextBlockTimestamp", [joiningTime]);
      // await ethers.provider.send("evm_mine", []); // mine a block
      await defisalary.addEmployee("Tester", employee.address, 1000);
      const newName = "TesterTwo";
      const newAddress = employee2.address;
      const newStatus = false;
      const newSalary = 2500;

      await defisalary.updateEmployeeDetails(
        newName,
        newAddress,
        newStatus,
        newSalary,
        0
      );

      const newEmployee = await defisalary.employees(0);

      expect(newEmployee.name).to.equal(newName);
      expect(newEmployee.walletAdd).to.equal(newAddress);
      expect(newEmployee.isActive).to.equal(newStatus);
      expect(newEmployee.salaryUSD).to.equal(newSalary);
      expect(newEmployee.joiningDate).to.equal(joiningTime);
      expect(newEmployee.lastPaymentDate).to.equal(joiningTime);
      expect(newEmployee.id).to.equal(0);
      expect(await defisalary.getEmployeesCount()).to.equal(1);
    });
  });

  describe("USD to ETH converstion", function () {
    it("Should fetch correct ETH Price", async function () {
      const { defisalary, ETH_USD_PRICE } = await loadFixture(
        deployDefisalaryFixture
      );
      const ethPrice = await defisalary.getLatestETHPrice();
      const expectedPrice = ethers.parseUnits(ETH_USD_PRICE.toString(), 10); // Convert to 18 decimals
      expect(ethPrice).to.equal(expectedPrice);
    });

    it("Should calculate ETH amount from USD correctly", async function () {
      const { defisalary } = await loadFixture(deployDefisalaryFixture);
      const usdAmount = 1000;

      // Manual calculation for comparison
      // $1000 = ? ETH at $2000/ETH
      // ? ETH = $1000 / $2000 = 0.5 ETH

      const expectedAmount = ethers.parseEther("0.5");
      const returnedAmount = await defisalary.usdToEth(usdAmount);
      expect(returnedAmount).to.equal(expectedAmount);
    });
  });

  describe("Automation", function () {
    it("Should pay salary after 30 days of last payment", async function () {
      const { defisalary, ONE_MONTH_IN_SECS, employee } = await loadFixture(
        deployDefisalaryFixture
      );

      await defisalary.addEmployee("Tester", employee.address, 1000);
      [upkeepNeeded] = await defisalary.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(false);
      await time.increase(ONE_MONTH_IN_SECS);
      [newUpkeepNeeded] = await defisalary.checkUpkeep("0x");
      expect(newUpkeepNeeded).to.equal(true);
    });

    it("Should return the ids of employees that need to be paid", async function () {
      const { defisalary, ONE_MONTH_IN_SECS, employee, employee2 } =
        await loadFixture(deployDefisalaryFixture);
      await defisalary.addEmployee("Tester", employee.address, 1000);
      await defisalary.addEmployee("TesterTwo", employee2.address, 3421);
      await time.increase(ONE_MONTH_IN_SECS);

      // Run checkUpkeep
      const [upkeepNeeded, performData] = await defisalary.checkUpkeep("0x");

      expect(upkeepNeeded).to.equal(true);

      // Decode the performData
      const [ids, count] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256[]", "uint256"],
        performData
      );

      // Assert count
      expect(count).to.equal(2n);

      // Assert both employees (0 and 1) are returned
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal(0n); // first employee added
      expect(ids[1]).to.equal(1n); // second employee added
    });

    it("Should automatically pay employees after 30 days", async function () {
      const { defisalary, ONE_MONTH_IN_SECS, owner, employee } =
        await loadFixture(deployDefisalaryFixture);

      // Add employee
      await defisalary.addEmployee("Tester", employee.address, 1000);

      // Fund the contract
      await owner.sendTransaction({
        to: await defisalary.getAddress(),
        value: ethers.parseEther("1"), // 1 ETH
      });

      // Move forward 30 days
      await time.increase(ONE_MONTH_IN_SECS);

      // Run checkUpkeep
      const [upkeepNeeded, performData] = await defisalary.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(true);

      // Get balance before payment
      const beforeBalance = await ethers.provider.getBalance(employee.address);

      // Call performUpkeep to pay salary
      await defisalary.performUpkeep(performData);

      // Get balance after payment
      const afterBalance = await ethers.provider.getBalance(employee.address);

      expect(afterBalance).to.be.gt(beforeBalance); // balance should increase
    });

    it("Should transfer right amount of salary", async function () {
      const { defisalary, ONE_MONTH_IN_SECS, owner, employee } =
        await loadFixture(deployDefisalaryFixture);
      await defisalary.addEmployee("Tester", employee.address, 500);
      await owner.sendTransaction({
        to: await defisalary.getAddress(),
        value: ethers.parseEther("9"),
      });

      await time.increase(ONE_MONTH_IN_SECS);

      // Run checkUpkeep
      const [upkeepNeeded, performData] = await defisalary.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(true);

      // Get balance before payment
      const beforeBalance = await ethers.provider.getBalance(employee.address);

      // Call performUpkeep to pay salary
      await defisalary.performUpkeep(performData);

      // Get balance after payment
      const afterBalance = await ethers.provider.getBalance(employee.address);
      const salaryInEth = await defisalary.usdToEth(500);
      expect(afterBalance - beforeBalance).to.equal(salaryInEth);
    });
  });

  describe("Admin Functions", function () {
    it("Should only let admin add an employee", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );

      // Connect as a non-owner (employee instead of owner)
      const newDefisalary = defisalary.connect(employee);

      await expect(newDefisalary.addEmployee("Tester", employee2.address, 3232))
        .to.be.revertedWithCustomError(defisalary, "OwnableUnauthorizedAccount")
        .withArgs(employee.address); // pass the caller address
    });

    it("Should only let admin remove an employee", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );
      await defisalary.addEmployee("Tester", employee2.address, 1211);
      const newDefisalary = await defisalary.connect(employee);
      await expect(newDefisalary.removeEmployee(0))
        .to.be.revertedWithCustomError(defisalary, "OwnableUnauthorizedAccount")
        .withArgs(employee.address);
    });

    it("Should only let admin update employee details", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );
      await defisalary.addEmployee("Tester", employee2.address, 1212);
      const newDefisalary = await defisalary.connect(employee);
      await expect(
        newDefisalary.updateEmployeeDetails(
          "NewName",
          employee2.address,
          true,
          1000,
          0
        )
      )
        .to.be.revertedWithCustomError(defisalary, "OwnableUnauthorizedAccount")
        .withArgs(employee.address);
    });

    it("Should only let owner change ownership", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );
      const newDefisalary = await defisalary.connect(employee);
      await expect(newDefisalary.changeOwner(employee2.address))
        .to.be.revertedWithCustomError(defisalary, "OwnableUnauthorizedAccount")
        .withArgs(employee.address);
    });

    it("Should only let owner withdraw funds", async function () {
      const { defisalary, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );
      const newDefisalary = await defisalary.connect(employee);
      await expect(newDefisalary.withdrawFunds())
        .to.be.revertedWithCustomError(defisalary, "OwnableUnauthorizedAccount")
        .withArgs(employee.address);
    });

    it("Should correctly withdraw all funds", async function () {
      const { defisalary, owner } = await loadFixture(deployDefisalaryFixture);

      // Send ETH to contract
      await owner.sendTransaction({
        to: await defisalary.getAddress(),
        value: ethers.parseEther("5"),
      });

      // Contract balance should update
      const contractBalanceBefore = await ethers.provider.getBalance(
        await defisalary.getAddress()
      );
      expect(contractBalanceBefore).to.equal(ethers.parseEther("5"));

      // Owner balance before withdrawal
      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );

      // Withdraw funds
      const tx = await defisalary.withdrawFunds();
      const receipt = await tx.wait();

      // Gas cost calculation
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Owner balance after withdrawal
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Contract should be empty
      const contractBalanceAfter = await ethers.provider.getBalance(
        await defisalary.getAddress()
      );
      expect(contractBalanceAfter).to.equal(0);

      // Owner should receive contract funds (minus gas)
      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + ethers.parseEther("5") - gasCost
      );
    });
  });

  describe("Events", function () {
    it("Should emit EmployeeAdded event when employee is added", async function () {
      const { defisalary, owner, employee } = await loadFixture(
        deployDefisalaryFixture
      );

      await expect(
        defisalary.connect(owner).addEmployee("Alice", employee.address, 1000)
      )
        .to.emit(defisalary, "EmployeeAdded")
        .withArgs(0, "Alice", employee.address, 1000);
    });

    it("Should emit EmployeeRemoved event when employee is removed", async function () {
      const { defisalary, owner, employee } = await loadFixture(
        deployDefisalaryFixture
      );

      await defisalary.addEmployee("Alice", employee.address, 1000);

      await expect(defisalary.removeEmployee(0))
        .to.emit(defisalary, "EmployeeRemoved")
        .withArgs(0);
    });

    it("Should emit EmployeeUpdated event when employee details are updated", async function () {
      const { defisalary, owner, employee, employee2 } = await loadFixture(
        deployDefisalaryFixture
      );

      await defisalary.addEmployee("Alice", employee.address, 1000);

      await expect(
        defisalary.updateEmployeeDetails(
          "AliceUpdated",
          employee2.address,
          false,
          2000,
          0
        )
      )
        .to.emit(defisalary, "EmployeeUpdated")
        .withArgs(0, "AliceUpdated", false, employee2.address, 2000);
    });

    it("Should emit SalaryPaid event when salary is paid", async function () {
      const { defisalary, owner, employee } = await loadFixture(
        deployDefisalaryFixture
      );

      await defisalary.addEmployee("Alice", employee.address, 1000);

      // fund contract
      await owner.sendTransaction({
        to: await defisalary.getAddress(),
        value: ethers.parseEther("10"),
      });

      // simulate 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(
        defisalary.performUpkeep(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256[]", "uint256"],
            [[0], 1]
          )
        )
      )
        .to.emit(defisalary, "SalaryPaid")
        .withArgs(0, 1000, await defisalary.usdToEth(1000));
    });
  });
});
