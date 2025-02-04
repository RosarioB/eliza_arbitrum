import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi,
    publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, arbitrumSepolia } from "viem/chains";
import { normalize } from "viem/ens";

const DEPLOYED_CONTRACT_ADDRESS = "0xf4e4c96ea0627501c2cbee561b1a877ccd0affd7"; // Arbitrum Sepolia

const erc721Abi = parseAbi([
    "function mintToken(address to, string calldata token_uri) external",
]);

const account = privateKeyToAccount(
    process.env.EVM_PRIVATE_KEY as `0x${string}`
);

const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.ETHEREUM_PROVIDER_ARBITRUMSEPOLIA),
}).extend(publicActions);

const publicClientMainnet = createPublicClient({
    chain: mainnet,
    transport: http(),
});

const resolveAddress = async (address: string) => {
    let resolvedAddress = address;
    if (address.endsWith(".eth")) {
        resolvedAddress = await publicClientMainnet.getEnsAddress({
            name: normalize(address),
        });
    }
    return resolvedAddress;
};

export const mintNft = async (recipient: string, uri: string) => {
    const address = await resolveAddress(recipient) as `0x${string}`;
    const txHash = await walletClient.writeContract({
        address: DEPLOYED_CONTRACT_ADDRESS,
        abi: erc721Abi,
        functionName: "mintToken",
        args: [address, uri],
        chain: arbitrumSepolia,
        account: account,
    });
    return txHash;
};
