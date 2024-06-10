import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DonateCrypto } from "../target/types/donate_crypto";
import { assert } from "chai";

describe("donate_crypto", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DonateCrypto as Program<DonateCrypto>;

  let baseAccount = anchor.web3.Keypair.generate();
  let vault = anchor.web3.PublicKey.default;
  let vaultBump;

  it("Initializes the base account", async () => {
    await program.rpc.initialize({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [baseAccount],
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    assert.equal(account.fee.toNumber(), 100);
    assert.equal(account.nextId.toNumber(), 0);
  });

  it("Adds a new campaign", async () => {
    await program.rpc.addCampaign(
      "Title",
      "Description",
      "VideoUrl",
      "ImageUrl",
      {
        accounts: {
          baseAccount: baseAccount.publicKey,
          author: provider.wallet.publicKey,
        },
      }
    );

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    assert.equal(account.campaigns.length, 1);
    assert.equal(account.campaigns[0].title, "Title");
  });

  it("Initializes the vault account", async () => {
    [vault, vaultBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      program.programId
    );

    await program.rpc.initializeVault(vaultBump, {
      accounts: {
        vault,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [],
    });

    const account = await program.account.vault.fetch(vault);
    assert.equal(account.bump, vaultBump);
  });

  it("Donates to a campaign", async () => {
    await program.rpc.donate(new anchor.BN(0), new anchor.BN(1000), {
      accounts: {
        baseAccount: baseAccount.publicKey,
        donor: provider.wallet.publicKey,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    assert.equal(account.campaigns[0].balance.toNumber(), 1000);
  });

  it("Withdraws from a campaign", async () => {
    const initialBalance = await provider.connection.getBalance(provider.wallet.publicKey);

    await program.rpc.withdraw(new anchor.BN(0), {
      accounts: {
        baseAccount: baseAccount.publicKey,
        author: provider.wallet.publicKey,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });

    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    assert.equal(account.campaigns[0].balance.toNumber(), 0);
    assert.equal(account.campaigns[0].active, false);

    // const finalBalance = await provider.connection.getBalance(provider.wallet.publicKey);
    // assert.equal(finalBalance, initialBalance + 900); // 1000 (donation) - 100 (fee) = 900
  });
});
