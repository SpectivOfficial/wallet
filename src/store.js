import EventEmitter from 'events'
import { provider, ethers, TOKEN_ADDRESS, TOKEN_ABI } from './eth'
const { app } = window.require('electron').remote
const fs = window.require('fs')
const path = window.require('path')


class Store extends EventEmitter
{
    constructor() {
        super()

        this.state = {
            wallet: null,
            tokenContract: new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider),
            sigBalance: ethers.utils.bigNumberify(0),
            ethBalance: ethers.utils.bigNumberify(0),
            txlist: {},
            sigPrice: 0.0,
            sigPrice24HChange: 0.0,
            errorFetchingSIGPrice: false,
            modalDisplayed: null,
            modalParams: {},
        }

        this.getSIGPrice()
        setInterval(() => {
            this.getSIGPrice()
        }, 60000)
    }

    emitState() {
        this.emit('new state', this.state)
    }

    //
    // actions
    //

    _intervalPendingTxs = null

    setWalletUnlocked(wallet) {
        this.state.wallet = wallet
        this.state.wallet.provider = provider
        this.state.tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet)

        this.emitState()

        this._intervalPendingTxs = setInterval(() => {
            this.checkPendingTxs()
        }, 5000)
    }

    changeWallet() {
        this.state.wallet = null
        this.state.tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider)

        clearInterval(this._intervalPendingTxs)
        this._intervalPendingTxs = null

        this.emitState()
    }

    async updateETHBalance() {
        this.state.ethBalance = ethers.utils.bigNumberify( await provider.getBalance( this.state.wallet.address ) )
        this.emitState()
    }

    async updateSIGBalance() {
        this.state.sigBalance = ethers.utils.bigNumberify( (await this.state.tokenContract.functions.balanceOf( this.state.wallet.address ))[0] )
        this.emitState()
    }

    getTxList() {
        let dataPath = app.getPath('userData')
        let txlistPath = path.join(dataPath, 'txs.json')
        console.log('txlist path ~~>', txlistPath)

        try {
            this.state.txlist = JSON.parse(fs.readFileSync(txlistPath, 'utf8'))
        } catch (err) {
            fs.writeFileSync(txlistPath, JSON.stringify(this.state.txlist))
        }

        this.emitState()
    }

    addTxToList(txHash, amount, token, to) {
        this.state.txlist[ this.state.wallet.address ] = (this.state.txlist[ this.state.wallet.address ] || []).concat({
            txHash,
            amount: `${amount}`,
            token,
            to,
            timestamp: Math.floor(new Date().getTime() / 1000),
            status: 'pending',
        })

        this.saveTxList()

        this.emitState()
    }

    saveTxList() {
        let dataPath = app.getPath('userData')
        let txlistPath = path.join(dataPath, 'txs.json')
        try {
            fs.writeFileSync(txlistPath, JSON.stringify(this.state.txlist))
        } catch (err) {
            // @@TODO
        }
    }

    async checkPendingTxs() {
        const txs = this.state.txlist[this.state.wallet.address] || []
        for (let tx of txs) {

            try {
                if (tx.status === 'pending') {
                    let txObj = await provider.getTransaction(tx.txHash); console.log('the tx ~>', txObj)
                    if (txObj === null) {
                        continue
                    }

                    let receipt = await provider.getTransactionReceipt(tx.txHash); console.log('receipt ~>', receipt)
                    if (receipt !== null) {
                        let block = await provider.getBlock(receipt.blockNumber)

                        if (receipt.status === 1) {
                            tx.status = 'succeeded'
                        } else if (receipt.status === 0) {
                            tx.status = 'failed'
                        } else {
                            console.error('unknown tx receipt status.  tx ~>', tx, 'receipt ~>', receipt)
                        }
                        tx.timestamp = block.timestamp
                    }

                    tx.to = txObj.to

                    if (txObj.data === '0x') {
                        tx.token = 'ETH'
                    } else if (txObj.data.substr(0, 10) === '0xa9059cbb') { // this is an ERC20 `.transfer(...)` call
                        tx.token = 'SIG'
                    } else {
                        throw new Error(`unknown transaction type (tx.data = ${txObj.data})`)
                    }

                    if (tx.token === 'ETH') {
                        tx.amount = ethers.utils.formatEther(txObj.value)
                    } else {
                        let n = ethers.utils.bigNumberify('0x' + txObj.data.substr(74, 64))
                        tx.amount = ethers.utils.formatEther(n)
                    }
                }
            } catch (err) {
                continue
            }
        }

        this.saveTxList()
        this.emitState()
    }

    async getSIGPrice() {
        try {
            let sigResp = await (await fetch('https://api.hitbtc.com/api/2/public/ticker/SIGBTC')).json()
            let btcResp = await (await fetch('https://api.hitbtc.com/api/2/public/ticker/BTCUSD')).json()

            let sigbtcClose = parseFloat(sigResp.last)
            let btcusdClose = parseFloat(btcResp.last)
            let sigPrice = sigbtcClose * btcusdClose

            let sigbtcOpen = parseFloat(sigResp.open)
            let btcusdOpen = parseFloat(btcResp.open)
            let sigPrice24HAgo = sigbtcOpen * btcusdOpen

            this.state.sigPrice24HChange = (sigPrice - sigPrice24HAgo) / sigPrice24HAgo

            this.state.sigPrice = sigPrice
            this.state.errorFetchingSIGPrice = false

        } catch (err) {
            this.state.errorFetchingSIGPrice = true
        }

        this.emitState()
    }

    showSendConfirmationModal(amount, token, recipient, onClickOK) {
        this.state.modalDisplayed = 'send-confirmation'
        this.state.modalParams = { amount, token, recipient, onClickOK }
        this.emitState()
    }

    showBadAddressModal() {
        this.state.modalDisplayed = 'bad-address'
        this.state.modalParams = {}
        this.emitState()
    }

    showBadValueModal() {
        this.state.modalDisplayed = 'bad-value'
        this.state.modalParams = {}
        this.emitState()
    }

    showInsufficientTokensModal(token) {
        this.state.modalDisplayed = 'insufficient-tokens'
        this.state.modalParams = { token }
        this.emitState()
    }

    showCreatedNewWalletModal(onClickOK) {
        this.state.modalDisplayed = 'created-new-wallet'
        this.state.modalParams = { onClickOK }
        this.emitState()
    }

    hideModal() {
        this.state.modalDisplayed = null
        this.state.modalParams = {}
        this.emitState()
    }

    async checkForUpdates(walletVersion) {
        let resp = await fetch('https://api.github.com/repos/SpectivOfficial/wallet/releases/latest')

        if (resp.status === 404) {
            return
        }

        let data = await resp.json()

        if (data.tag_name !== walletVersion) {
            this.state.modalDisplayed = 'update-available'
            this.state.modalParams = {
                onClickOK: () => this.hideModal()
            }
            this.emitState()
        }
    }
}

export default Store



