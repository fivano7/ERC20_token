App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function() {
    console.log("App initialized...")
    return App.initWeb3()
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545')
      web3 = new Web3(App.web3Provider)
    }

    return App.initContracts()
  },

  initContracts: function() {
    //possible because of bs-config.js file
    $.getJSON("CroTokenSale.json", function(croTokenSale) {
      App.contracts.CroTokenSale = TruffleContract(croTokenSale)
      App.contracts.CroTokenSale.setProvider(App.web3Provider)
      App.contracts.CroTokenSale.deployed().then(function(croTokenSale) {
        console.log("Cro token sale address: ", croTokenSale.address)
      })
    }).done(function() {
        $.getJSON("CroToken.json", function(croToken) {
        App.contracts.CroToken = TruffleContract(croToken)
        App.contracts.CroToken.setProvider(App.web3Provider)
        App.contracts.CroToken.deployed().then(function(croToken) {
          console.log("Cro token address: ", croToken.address)
          })

          App.listenForEvents()
          return App.render()
        })
    })
  },

  //Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.CroTokenSale.deployed().then(function(instance) {
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest',
      }).watch(function(error,event) {
        console.log("Event triggered", event)
        App.render()
      })
    })
  },

  render: function() {
    //to prevent double loading 
    if (App.loading) {
      return
    }
    App.loading = true

    let loader = $('#loader')
    let content = $('#content')

    loader.show()
    content.hide()

    //load account data
    web3.eth.getCoinbase(function(err,account) {
      if(err===null) {
        App.account = account;
        $('#accountAddress').html("Your account: " + account)
      }
    })

    //Load token sale contract
    App.contracts.CroTokenSale.deployed().then(function(instance) {
      croTokenSaleInstance = instance
      return croTokenSaleInstance.tokenPrice()
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice
      $('.token-price').html(web3.fromWei(App.tokenPrice, 'ether').toNumber())
      return croTokenSaleInstance.tokensSold()
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber()
      $('.tokens-sold').html(App.tokensSold)
      $('.tokens-available').html(App.tokensAvailable)

      let progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100
      $('#progress').css('width', progressPercent + '%')

      //Load token contract
      App.contracts.CroToken.deployed().then(function(instance) {
        croTokenInstance = instance
        return croTokenInstance.balanceOf(App.account)
      }).then(function(balance) {
        $('.cro-balance').html(balance.toNumber())

        App.loading = false
        loader.hide()
        content.show()
      })

    })
  },

  buyTokens: function() {
      $('#content').hide()
      $('#loader').show()
      let numberOfTokens = $('#numberOfTokens').val()
      App.contracts.CroTokenSale.deployed().then(function(instance) {
        return instance.buyTokens(numberOfTokens, {
          from: App.account,
          value: numberOfTokens * App.tokenPrice,
          gas: 500000
        })
      }).then(function(result) {
          console.log("Tokens bought...")
          $('form').trigger('reset') //reset number of tokens in form
          //Wait for sell event
        })
  }
}



$(function() {
  $(window).load(function() {
    App.init()
  })
})