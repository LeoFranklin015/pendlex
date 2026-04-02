// Contract addresses from INTEGRATION_GUIDE.md

export interface AssetAddresses {
  symbol: string;
  ticker: string;
  xStock: string;
  pxToken: string;
  dxToken: string;
  lpToken: string;
  pythFeedId: string;
}

export interface ContractConfig {
  pythContract: string;
  pythAdapter: string;
  usdc: string;
  vault: string;
  exchange: string;
  marketKeeper: string;
  escrow: string;
  assets: readonly AssetAddresses[];
}

export const PROD_INK_SEPOLIA: ContractConfig = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter: "0xb26b353B4247f9db66175b333CDa74a7c068D341",
  usdc: "0xC80EF19a1F4F49953B0383b411a74fd50f2ca361",
  vault: "0x9e35DE19e3D7DB531C42fFc91Cc3a6F5Ba30B610",
  exchange: "0x924eb79Bb78981Afa209E45aB3E50ee9d77D1D0F",
  marketKeeper: "0xcF0a135097b1CA2B21ADDeae20a883D9BACE1f74",
  escrow: "0xC18288E58B79fAac72811dC1456515A88147e85a",
  assets: [
    {
      symbol: "TSLA", ticker: "TSLAxt",
      xStock: "0x9F64b176fEDF64a9A37ba58d372f3bd13B5F73b4",
      pxToken: "0x94461B0C10B371c9dE4DfFD1A08249e07c136d37",
      dxToken: "0x1FC97eAd7E36926bE30229762458C2B2aBB77d6F",
      lpToken: "0x6DfeBd1e56c26e055F3AD1FC3397EC7e68f8dD5C",
      pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
    },
    {
      symbol: "NVDA", ticker: "NVDAxt",
      xStock: "0xfeE1b917518EFa5c63C6baB841426F6A52b8581e",
      pxToken: "0xC1EFf33ba4fA5Ae036202Fe098030e59e078dd6D",
      dxToken: "0x12189923F13e0c2eD2c450189E7419E772281866",
      lpToken: "0x5b9D0DEE7CC10B4043E44F4EC1CE768c5c7cf745",
      pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
    },
    {
      symbol: "GOOGL", ticker: "GOOGLxt",
      xStock: "0x9eE3eb32dD9Da95Cd1D9C824701A1EcF9AE046B2",
      pxToken: "0x047BF5F5a416d1A0E8f98a99538CEb0c7bC9aD3B",
      dxToken: "0x7345c2917E2e6960C0dAc0A3079cc94b4246aC92",
      lpToken: "0xbc3f35De8571Ce748c82255CBA411b429572CfF8",
      pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
    },
    {
      symbol: "AAPL", ticker: "AAPLxt",
      xStock: "0x3e3885a7106107728afEF74A0000d90D3fA3cd1e",
      pxToken: "0x65abD57f02D23F774631778550b33f59cA4D300D",
      dxToken: "0xE7fF40cAB800a5E6DB733BF30D733777eE3285b5",
      lpToken: "0xEF7B7faF6d25E58925A523097d3888Bccba91F6e",
      pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
    },
    {
      symbol: "SPY", ticker: "SPYxt",
      xStock: "0xC16212b6840001f0a4382c3Da3c3f136C5b1cC31",
      pxToken: "0xC6555380D2E6AAA3Ca7d803a237d4c21e0e9D1a3",
      dxToken: "0x928dA312a5cDAc140C7cD18F8eCBCaeb73796B9f",
      lpToken: "0x01aA0e0Fa5623A16DF232ade97095B5919f9E183",
      pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
    },
    {
      symbol: "TBLL", ticker: "TBLLxt",
      xStock: "0x06fdEB09bdCC13eCCC758b15DC81a45c839632d7",
      pxToken: "0x5e421FEAD3A1ad4A48843d1Eaea64Aa7d73a7F96",
      dxToken: "0x36ED5c732bA99a715e491F6601011D804ED6Fd6C",
      lpToken: "0x3119eDacE1c3b43e81F65F635c1E48Ef5F89409b",
      pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2",
    },
    {
      symbol: "GLD", ticker: "GLDxt",
      xStock: "0xedB61935572130a7946B7FA9A3EC788367047E4D",
      pxToken: "0xAd284878a45E75E8D8e5128573a708cFc99F9730",
      dxToken: "0x00e2675da5031dd4d107A092C34e8E01196c7cf9",
      lpToken: "0xf5B69cDF448BE6e7334823b085eBD50587Bd0E77",
      pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820",
    },
    {
      symbol: "SLV", ticker: "SLVxt",
      xStock: "0x24A25fB43521D93AB57D1d57B0531fA5813a238c",
      pxToken: "0xD323e038Be2f630e9119c19AD152843b898902a0",
      dxToken: "0xeF7Dbea9B659EecD793AbD1b13c66431d6A695af",
      lpToken: "0xf2420295b1C1C9f9ee5a9277770e7df30abC3504",
      pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
    },
  ],
};

export const PROD_ETH_SEPOLIA: ContractConfig = {
  pythContract: "0x2880aB155794e7179c9eE2e38200202908C17B43",
  pythAdapter: "0x04e32F127a2baEA28512Fa04F1dCD82e1Fdf3971",
  usdc: "0xF2CE01ca6E39873a4d51cC40353Df309Ec424103",
  vault: "0xb9DA59D8A25B15DFB6f7A02EB277ADCC34d8B5a8",
  exchange: "0xEaB336258044846C5b9523967081BDC078C064d6",
  marketKeeper: "0xF382a19D4F3A8aD4288eE55CA363f47E91ceD563",
  escrow: "0xC1481eE1f92053A778B6712d6F46e3BeaB339FD7",
  assets: [
    {
      symbol: "TSLA", ticker: "TSLAxt",
      xStock: "0x27c253BB83731D6323b3fb2B333DcF0C94b6031e",
      pxToken: "0x048F9f6B51E3cd6a0D421FDA035931d2bA695149",
      dxToken: "0x356469a8dF616AA8d16CA606A0b5426D740701Ae",
      lpToken: "0x591661b08147e34E911Ea2eBC005F009E6eE93B8",
      pythFeedId: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
    },
    {
      symbol: "NVDA", ticker: "NVDAxt",
      xStock: "0xaDfdf3EC7dC440931D363DA1D97b8Ee0479Dc409",
      pxToken: "0x0e318c4eBD5A01c5b2f2484151f6209cfdfd538a",
      dxToken: "0x9C41f79fB6D8856f4446c94BF307353064991163",
      lpToken: "0xB553Cdb7642d3C7ADbb202AFa3c626a5Fd7FF1A1",
      pythFeedId: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
    },
    {
      symbol: "GOOGL", ticker: "GOOGLxt",
      xStock: "0x8A36935c0F5137ceA736F28886ef8F480a1a1727",
      pxToken: "0xD94574363c0Bb7c99F27F32d104e98b974676cE9",
      dxToken: "0x0b64fed2D8b88603eF69B90EBaa549F54CE80831",
      lpToken: "0x72871F9b5Fc00225B25F8841a57b03419fF3bA72",
      pythFeedId: "0x5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
    },
    {
      symbol: "AAPL", ticker: "AAPLxt",
      xStock: "0x6DEfC6061Cafa52d96FAf60AE7A7D727a75C3Bdb",
      pxToken: "0x39f90Ec480F9FA4F18216b9847204bFA9AC38e7A",
      dxToken: "0xb8c41D20f2e73d4A425f0b97C219eBb0b6add321",
      lpToken: "0x2F0C60F95a10611E40F6717A6FDb9Eb5Cf1C7be5",
      pythFeedId: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
    },
    {
      symbol: "SPY", ticker: "SPYxt",
      xStock: "0x7312c657e8c73c09dD282c5E7cBdDf43ace25cFc",
      pxToken: "0xc8365cABDAa9A413bE023395813C48461fE97573",
      dxToken: "0x72fDEdCB8b086e07ac253437Fa3111101dcFA4f8",
      lpToken: "0x4e3159b26ba5Ca9521658c4D203f38472FC88Da9",
      pythFeedId: "0x19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
    },
    {
      symbol: "TBLL", ticker: "TBLLxt",
      xStock: "0x6b4aDe3cAa2bEa98CEbe7019E09d69c23CD11C42",
      pxToken: "0x4b248fa6B6F62eA77A2666Ad8CfC9C16215B1e5A",
      dxToken: "0x3eC401F51Ca05BD2Aea4E2A28B96bfB463c7214B",
      lpToken: "0xFB80c2DD9c2880be70b3d43C5F0EFEa8E2ef1c21",
      pythFeedId: "0x6050efb3d94369697e5cdebf4b7a14f0f503bf8cd880e24ef85f9fbc0a68feb2",
    },
    {
      symbol: "GLD", ticker: "GLDxt",
      xStock: "0xeae1f4476fDBD4FaED890568b1Cf69F372d72462",
      pxToken: "0xc8e614bF58F3b5b27A007Af826Bb00FF27a4c645",
      dxToken: "0xB8e66090d72e0Bb32e1A5aa8B7B104816b1889a8",
      lpToken: "0x93d02177AAb72Be67B4bc21821856F7E3ddb53F6",
      pythFeedId: "0x18bc5360b4a8d29fd8de4c7f9e40234440de7572c5ff74f0697f14d2afd5a820",
    },
    {
      symbol: "SLV", ticker: "SLVxt",
      xStock: "0x732C084288F3E7eF4D0b6Cdb6bdcbFd072DfEb92",
      pxToken: "0xf567a061Cd60F70510425E8Deb4eB8c8D67A7fb2",
      dxToken: "0x7e65fe690639a06c77ea2a89a99d1EdF58c8D0ba",
      lpToken: "0xf22071f7b7a3099702f5743FE88307BCCdc6f2C2",
      pythFeedId: "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
    },
  ],
};

export const MOCK_INK_SEPOLIA = {
  mockPyth: "0x6C0602E1ef5F6a841ae61DF5A996d04BE7D21F6D",
  pythAdapter: "0x73AA2f12E39110E5A2328F23Fc97ba0F024c13D6",
  usdc: "0x0fE3321c5ACAE1ac8739978216F93AaE674EC1fE",
  vault: "0xF0391bEACCA59d2a1A4A339af88dCDeAe210e6B6",
  exchange: "0x859305A541536B1A2A3BFcaE05244DEAfdB1E167",
  marketKeeper: "0xC4E002Ab619C3C31b3Bc631b299e28e3D6C93CCa",
  escrow: "0x662dc3B17696A688efd297D9DF5eFa4B21B607fB",
} as const;

export const MOCK_ETH_SEPOLIA = {
  mockPyth: "0x16Ddd24738b05FC80989cbd2577F606962b65C31",
  pythAdapter: "0x16eaB2D3E31Cc44D040Cf316141CD460F51DF50c",
  usdc: "0x6913883E8c11829AC213760556F3C3b35148F296",
  vault: "0xE7e63166543CEAE1d389e38f8b3faee8129cAfC2",
  exchange: "0xDbfA9BBdfAb52DCB453105D70c5991d3D1C0E34D",
  marketKeeper: "0x9e5b98455102F21f47d6e0A6FC6a33f4c382aE51",
  escrow: "0xb2131C8384599d95d2Cdd7733529Bfd7B3c68375",
} as const;

export type ContractMode = "prod" | "mock";

// Mock deployments created their own MockXStock tokens during MockDeploy.
// Those addresses are NOT the same as the prod Dinari xStock addresses.
// Until we capture the mock asset addresses (from deployments/mock.json),
// mock mode falls back to prod contracts for the vault (vault deposit/withdraw
// does not depend on market status -- it works anytime).
// Mock mode currently only affects the exchange/keeper (market gating).
export function getContractConfig(chainId: number, _useMock: boolean) {
  switch (chainId) {
    case 763373:
      return PROD_INK_SEPOLIA;
    case 11155111:
      return PROD_ETH_SEPOLIA;
    default:
      throw new Error(`Unsupported chain: ${chainId}`);
  }
}

export function getAssetByTicker(cfg: ContractConfig, ticker: string): AssetAddresses | null {
  return cfg.assets.find((a) => a.ticker === ticker) ?? null;
}

export function getAssetBySymbol(cfg: ContractConfig, symbol: string): AssetAddresses | null {
  return cfg.assets.find((a) => a.symbol === symbol) ?? null;
}

export function getAssetByDxToken(chainId: number, dxToken: string) {
  const cfg = chainId === 763373 ? PROD_INK_SEPOLIA : PROD_ETH_SEPOLIA;
  const lower = dxToken.toLowerCase();
  return cfg.assets.find((a) => a.dxToken.toLowerCase() === lower) ?? null;
}
