import fs from 'fs'


let wallets = fs.readFileSync('wallet.txt', 'utf-8').split('\n').map(line => line.trim());
let amountBridged = 0
let nonce         = 0
let firstDay = '2050-04-20'
let lastDay  = '2000-04-20'
let currentTime = new Date().toLocaleTimeString(); 
let filename = 'results-'+ currentTime + '.csv'

async function fetchInfo(address, page, amountBridged, nonce, firstDay, lastDay, unicAddress) {
    try {
        const response =  await fetch(`https://block-explorer-api.mainnet.zksync.io/transactions?address=${address}&pageSize=10&page=${page}&toDate=2023-07-05T13%3A42%3A59.237Z`)
        const data = await response.json();
        for (let tx of data.items) {
            if (tx.status === 'verified') {
                firstDay = new Date(firstDay);
                lastDay = new Date(lastDay);
                let newDay = new Date(tx.receivedAt)
                if (!unicAddress.includes(tx.to)) {
                    unicAddress.push(tx.to);
                  }
                if (firstDay > newDay) {
                    firstDay = newDay
                }
                if (lastDay < newDay) {
                    lastDay = newDay
                }
                if (nonce < tx.nonce) {
                    nonce = tx.nonce
                }
                amountBridged += tx.value/1e18
            }
        }
        if (data.meta.totalPages > data.meta.currentPage) {
            page++
            fetchInfo(address, page, amountBridged, nonce, firstDay, lastDay, unicAddress)
        } else {
            addRowToCSV(address, nonce, unicAddress.length, amountBridged.toFixed(4), await formatDate(firstDay), await formatDate(lastDay), await dateDiff(firstDay, lastDay))
        }
    } catch (error) {
        console.log(`Address ${address} Failed`.red)
    }
}

async function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0'); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = String(date.getFullYear()); 
    return `${year}-${month}-${day}`
}

async function dateDiff(dateStart, dateEnd) {
    let timeDiff = Math.abs(dateEnd.getTime() - dateStart.getTime());
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays
}

function addRowToCSV(address, nonce, interactedAddress ,amount, firstDay, lastDay, dayDiff) {
    const row = `${address},${nonce},${interactedAddress},${amount},${firstDay},${lastDay},${dayDiff}\n`;
    fs.appendFile(filename, row, (err) => {
    });
}



async function main() {
    addRowToCSV('Address', 'TxCount', "Interacted address", "Bridged amount", "First Day", "Last Day", "Days count")
    let counter = 1
    for (let wallet of wallets){
        process.stdout.clearLine();  
        process.stdout.cursorTo(0); 
        process.stdout.write(`Progress ${counter}/${wallets.length}`);
        await fetchInfo(wallet, 1, amountBridged, nonce, firstDay, lastDay, [])
        counter ++
    }
}

main()