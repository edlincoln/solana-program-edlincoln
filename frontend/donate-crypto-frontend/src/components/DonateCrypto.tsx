import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN, setProvider } from "@coral-xyz/anchor"
import idl from "../../../../anchor_project/donate_crypto/target/idl/donate_crypto.json"
import { DonateCrypto } from "../../../../anchor_project/donate_crypto/target/types/donate_crypto"
import { PublicKey } from '@solana/web3.js';

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.address)

export const DonateCryptos: FC = () => {
    const ourWallet = useWallet();
    const { connection } = useConnection()
    const [campaings, setcampaings] = useState([])

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    }

    const createCampain = async () => {
        try {
            const anchProvider = getProvider()
            const program = new Program<DonateCrypto>(idl_object, anchProvider)

            await program.methods.addCampaign("Campaing1", "New campaing","","").accounts({
                baseAccount: anchProvider.publicKey
            }).rpc()

            console.log("Wow, new campaing was created")

        } catch (error) {
            console.error("Error while creating a campaing: " + error)
        }
    }

    const getCampains = async () => {
        try {
            const anchProvider = getProvider()
            const program = new Program<DonateCrypto>(idl_object, anchProvider)
            Promise.all((await connection.getParsedProgramAccounts(programID)).map(async campaing => ({
                ...(await program.account.baseAccount.fetch(campaing.pubkey)),
                pubkey: campaing.pubkey
            }))).then(campaings => {
                console.log(campaings)
                setcampaings(campaings)
            })


        } catch (error) {
            console.error("Error while getting campaings: " + error)
        }
    }

    const donateCrypto = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program<DonateCrypto>(idl_object, anchProvider)

            await program.methods.donate(0, new BN(1000 * web3.LAMPORTS_PER_SOL))
                .accounts({
                    baseAccount: publicKey,
                    // user: anchProvider.publicKey
                }).rpc()

            console.log(" Deposit done: " + publicKey)

        } catch (error) {
            console.error("Error while depositing to a campaing: " + error)
        }
    }

    const withdrawsCrypto = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program<DonateCrypto>(idl_object, anchProvider)

            await program.methods.withdraw(0)
                .accounts({
                    baseAccount: publicKey,
                    // user: anchProvider.publicKey
                }).rpc()

            console.log(" Deposit done: " + publicKey)

        } catch (error) {
            console.error("Error while depositing to a campaing: " + error)
        }
    }
    return (
        <div>
            {
                campaings.map((campaing) => {
                    return (
                        <div className='md:hero-content flex flex-col'>
                            <h1>{campaing.title.toString()}</h1>
                            <span>{campaing.balance.toString()}</span>
                            <button
                                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                onClick={() => donateCrypto(campaing.pubkey)}>
                                <span>
                                    Deposit 0.1
                                </span>
                            </button>
                        </div>
                    )
                })
            }
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={createCampain}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Create Campaign
                        </span>
                    </button>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={getCampains}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Fetch Campaign
                        </span>
                    </button>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={donateCrypto}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Donate
                        </span>
                    </button>                    
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={withdrawsCrypto}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Withdraws
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};