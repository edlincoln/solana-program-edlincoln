use anchor_lang::prelude::*;

declare_id!("3B2UE8MjXCE2v5Ya5SJQBnRdyusN5Q4GRnKo9iYezjj4");

#[program]
pub mod donate_crypto {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        base_account.fee = 100;
        base_account.next_id = 0;
        Ok(())
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>, bump: u8) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.bump = bump;
        Ok(())
    }

    pub fn add_campaign(
        ctx: Context<AddCampaign>,
        title: String,
        description: String,
        video_url: String,
        image_url: String,
    ) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        let campaign = Campaign {
            author: *ctx.accounts.author.key,
            title,
            description,
            video_url,
            image_url,
            balance: 0,
            active: true,
        };
        base_account.campaigns.push(campaign);
        base_account.next_id += 1;
        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, campaign_id: u64, amount: u64) -> Result<()> {
        let base_account = &mut ctx.accounts.base_account;
        let campaign = &mut base_account.campaigns[campaign_id as usize];
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.donor.key,
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.donor.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        campaign.balance += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, campaign_id: u64) -> Result<()> {
        let author = &mut ctx.accounts.author;
        let vault = &mut ctx.accounts.vault;
        let base_account = &mut ctx.accounts.base_account;
        let fee = base_account.fee.clone();
        let campaign = &mut base_account.campaigns[campaign_id as usize];

        let new_balance = campaign.balance.checked_sub(fee).unwrap_or(0);

        author.to_account_info().try_borrow_mut_lamports()?.checked_add(new_balance);
        vault.to_account_info().try_borrow_mut_lamports()?.checked_sub(campaign.balance);

        campaign.balance = 0;
        campaign.active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 128)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(init, payer = user, space = 8 + 8, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCampaign<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    pub author: Signer<'info>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub author: Signer<'info>,
    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub bump: u8,
}

#[account]
pub struct BaseAccount {
    pub fee: u64,
    pub next_id: u64,
    pub campaigns: Vec<Campaign>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Campaign {
    pub author: Pubkey,
    pub title: String,
    pub description: String,
    pub video_url: String,
    pub image_url: String,
    pub balance: u64,
    pub active: bool,
}