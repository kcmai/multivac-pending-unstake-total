const fetch = require('cross-fetch')
const ObjectsToCsv = require('objects-to-csv');

async function calculateUnstaking() {
    try {
        let currAddress = 0
        let pendingUnstakeTotal = 0
        let unstakerCsvProfiles = []
        const batchSize = 250
        const addressList = JSON.parse(await getAddressList())["data"]

        console.log("=======================================")
        console.log("Starting Application...")
        console.log(`Number of stakers in pool: ${addressList.length}`)
        console.log("=======================================")

        while (currAddress <= addressList.length) {
            let addressUnstakingAmountPromises = []
            for (let i = currAddress; i < currAddress + batchSize; i++) {
                if (i > addressList.length - 1) break
                addressUnstakingAmountPromises.push(getAddressProfileResponse(addressList[i]["id"]))
            }

            const gatheredUnstakerProfiles = await Promise.all(addressUnstakingAmountPromises)
            gatheredUnstakerProfiles.forEach((unstakerProfile) => {
                if(unstakerProfile == null || unstakerProfile.charAt(0) == "<") return

                const stakeProfile = JSON.parse(unstakerProfile)["stake"]
                const withdrawPending = (stakeProfile["withdrawPending"] / 1e18).toFixed(2)

                if(withdrawPending > 0) {
                    unstakerCsvProfiles.push({
                        Rank: stakeProfile["rank"],
                        Address: stakeProfile["id"],
                        "Pending Unstake(MTV)": withdrawPending,
                        "Percentage Unstake(%)": `${((withdrawPending / ((stakeProfile["bep20"] / 1e18) + (stakeProfile["erc20"] / 1e18) + (stakeProfile["mainnet"] / 1e18))) * 100).toFixed(2)}`
                    })
                }
                pendingUnstakeTotal += stakeProfile["withdrawPending"] / 1e18
            })

            console.log(`Progress: ${((currAddress/addressList.length) * 100).toFixed(2)} %`)
            currAddress += batchSize
        }

        const csv = new ObjectsToCsv(unstakerCsvProfiles);
        await csv.toDisk('./unstakers.csv');

        console.log("Progress: 100.00 %")
        console.log("=======================================")
        console.log(`Pending Unstake Total ≈ ${pendingUnstakeTotal.toLocaleString()}`)
        console.log("=======================================")
    } catch (error) {
        console.log(error)
    }
}

async function getAddressList() {
    let response = null

    try {
        response = await fetch("https://e.mtv.ac/stake/tops", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/x-www-form-urlencoded"
            },
            "body": "pageNum=1&pageSize=15000",
            "method": "POST"
        })
    } catch (error) {
        console.log(`Error retrieving address list`)
    }
    return response ? await response.text() : null
}

async function getAddressProfileResponse(address) {
    let response = null

    try {
        response = await fetch("https://e.mtv.ac/account/get", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/x-www-form-urlencoded",
                "Referer": `https://e.mtv.ac/account.html?address=${address}`,
            },
            "body": `address=${address}`,
            "method": "POST"
        })
    } catch (error) {
        console.log(`Error retrieving address profile for ${address}: ${error}`)
    }
    return response ? await response.text() : null
}

calculateUnstaking()