//We need migrations file in order to change the state of blockchain
const CroToken = artifacts.require("CroToken");
const CroTokenSale = artifacts.require("CroTokenSale");

module.exports = function (deployer) {
  deployer.deploy(CroToken, 1000000).then(function() {
    let tokenPrice = 1000000000000000
    return deployer.deploy(CroTokenSale, CroToken.address, tokenPrice)
  })
}
