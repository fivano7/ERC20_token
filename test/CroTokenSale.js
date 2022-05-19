let CroTokenSale = artifacts.require('./CroTokenSale.sol')
let CroToken = artifacts.require('./CroToken.sol')

contract('CroTokenSale', function(accounts) {
	let tokenSaleInstance
	let tokenInstance
	let tokenPrice = 1000000000000000 //0.001 ETH in wei
	let tokensAvailable = 750000
	let admin = accounts[0]
	let buyer = accounts[1]
	let numberOfTokens;

	it('Initializes the contract with the correct values', function () {
		return CroTokenSale.deployed().then(function(instance) {
			tokenSaleInstance = instance
			return tokenSaleInstance.address
		}).then(function(address) {
			assert.notEqual(address, 0x0, 'has contract address')
			return tokenSaleInstance.tokenContract()
		}).then(function(address) {
			assert.notEqual(address, 0x0, 'has token contract address')
			return tokenSaleInstance.tokenPrice()
		}).then(function(price) {
			assert.equal(price, tokenPrice, 'token price is correct')
		})
	})

	//1.) deploy CroToken and give admin (deployer) 100% of tokens
	//2.) deploy CroTokenSale and transfer 75% of tokens from admin to CroTokenSale
	//3.) buy 10 tokens from CroTokenSale from buyer
	it('facilitates token buying', function() {
		return CroToken.deployed().then(function(instance) {
			//Grab token instance first
			tokenInstance = instance
			return CroTokenSale.deployed()
		}).then(function(instance) {
			//Grab tokenSale instance
			tokenSaleInstance = instance
			//Transfer 75% of all tokens to TokenSale from deployer
			return tokenInstance.transfer(tokenSaleInstance.address, tokensAvailable, {from: admin})
		}).then(function(receipt) {
			numberOfTokens = 10
			return tokenSaleInstance.buyTokens(numberOfTokens, {from: buyer, value: numberOfTokens * tokenPrice})
		}).then(function(receipt) {
			assert.equal(receipt.logs.length, 1, 'triggers one event')
			assert.equal(receipt.logs[0].event, 'Sell', 'should be "Sell" event')
			assert.equal(receipt.logs[0].args._buyer, buyer, 'logs the account that purchased the tokens')
			assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased')
			return tokenSaleInstance.tokensSold()
		}).then(function(amount) {
			assert.equal(amount.toNumber(), numberOfTokens, 'increments the number of tokens sold')
			return tokenInstance.balanceOf(buyer)
		}).then(function(balance) {
			assert.equal(balance.toNumber(), numberOfTokens, "buyer successfully bought tokens")
			return tokenInstance.balanceOf(tokenSaleInstance.address)
		}).then(function(balance) {
			assert.equal(balance.toNumber(), tokensAvailable - numberOfTokens, 'tokenSaleInstance successfully got tokens')
			//try to buy tokens for different ether value
			return tokenSaleInstance.buyTokens(numberOfTokens, {from: buyer, value: 1})
		}).then(assert.fail).catch(function(error) {
			assert(error.message.indexOf('revert') >= 0, 'msg.value must match token price for numberOfTokens')
			//trying to purchase more tokens than available in the contract
			return tokenSaleInstance.buyTokens(800000, {from: buyer, value: 1})
		}).then(assert.fail).catch(function(error) {
			assert(error.message.indexOf('revert') >= 0, 'cannot purchase more tokens than available')
		})
	})

	it('Ends token sale', function() {
		return CroToken.deployed().then(function(instance) {
			tokenInstance = instance
			return CroTokenSale.deployed()
		}).then(function(instance) {
			tokenSaleInstance = instance
			//try to end token sale not from admin account
			return tokenSaleInstance.endSale({from: buyer})
		}).then(assert.fail).catch(function(error) {
			assert(error.message.indexOf('revert') >= 0, 'only admin can end token sale')
			//end token sale as admin
			return tokenSaleInstance.endSale({from: admin})
		}).then(function(receipt) {
			return tokenInstance.balanceOf(admin)
		}).then(function(balance) {
			assert.equal(balance.toNumber(), 999990, 'return all unsold Cro tokens to admin')
			//check the remaining CroTokenSale contract's token balance
			return tokenInstance.balanceOf(tokenSaleInstance.address)
		}).then(function(balance) {
			assert.equal(balance.toNumber(), 0, "CroTokenSale contract doesn't have any more tokens")
		})
	})

})