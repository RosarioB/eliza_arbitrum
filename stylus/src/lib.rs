// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloy_primitives::{uint, Address, FixedBytes, U128, U256};
/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{
    prelude::*,
    evm,
    storage::{StorageAddress, StorageBool, StorageMap, StorageU256, StorageString}
};
use alloy_sol_types::sol;

// *********** utils/math/storage/unchecked.rs **************
use alloy_primitives::Uint;
use alloy_sol_types::sol_data::{IntBitCount, SupportedInt};
use stylus_sdk::storage::StorageUint;

/// Adds value and assign the result to `self`, ignoring overflow.
pub(crate) trait AddAssignUnchecked<T> {
    /// Adds `rhs` and assign the result to `self`, ignoring overflow.
    fn add_assign_unchecked(&mut self, rhs: T);
}

impl<const B: usize, const L: usize> AddAssignUnchecked<Uint<B, L>>
    for StorageUint<B, L>
where
    IntBitCount<B>: SupportedInt,
{
    fn add_assign_unchecked(&mut self, rhs: Uint<B, L>) {
        let new_balance = self.get() + rhs;
        self.set(new_balance);
    }
}

/// Subtract value and assign the result to `self`, ignoring overflow.
pub(crate) trait SubAssignUnchecked<T> {
    /// Subtract `rhs` and assign the result to `self`, ignoring overflow.
    fn sub_assign_unchecked(&mut self, rhs: T);
}

impl<const B: usize, const L: usize> SubAssignUnchecked<Uint<B, L>>
    for StorageUint<B, L>
where
    IntBitCount<B>: SupportedInt,
{
    fn sub_assign_unchecked(&mut self, rhs: Uint<B, L>) {
        let new_balance = self.get() - rhs;
        self.set(new_balance);
    }
}
// *************************


// Define some persistent storage using the Solidity ABI.
// `ERC721` will be the entrypoint.
sol_storage! {
    #[entrypoint]
    pub struct ERC721 {
        StorageMap<Address, StorageU256> _balances;
        StorageMap<U256, StorageAddress> _owners;
        StorageMap<Address, StorageMap<Address, StorageBool>> _operator_approvals;
        StorageMap<U256, StorageAddress> _token_approvals;
        uint256 counter;
        StorageMap<U256, StorageString> _token_uris;
    }
}

sol! {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed token_id
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed token_id
    );
    event MetadataUpdate(uint256 token_id);
    error ERC721InvalidOwner(address owner);
    error ERC721InvalidReceiver(address receiver);
    error ERC721InvalidSender(address sender);
    error ERC721NonexistentToken(uint256 token_id);
    error ERC721InsufficientApproval(address operator, uint256 token_id);
    error ERC721InvalidApprover(address approver);
}

#[derive(SolidityError)]
pub enum Error {
    InvalidOwner(ERC721InvalidOwner),
    InvalidReceiver(ERC721InvalidReceiver),
    InvalidSender(ERC721InvalidSender),
    NonexistentToken(ERC721NonexistentToken),
    InsufficientApproval(ERC721InsufficientApproval),
    InvalidApprover(ERC721InvalidApprover),
}


/// Declare that `ERC721` is a contract with the following external methods.
#[public]
impl ERC721 {

    pub fn _set_token_uri(&mut self, token_id: U256, token_uri: String) {
        self._token_uris.setter(token_id).set_str(token_uri);
        evm::log(MetadataUpdate { token_id });
    }
    
    pub fn token_uri(
        &self,
        token_id: U256,
    ) -> Result<String, Error> {
        let _owner = self._require_owned(token_id)?;
        let token_uri = self._token_uris.getter(token_id).get_string();
        return Ok(token_uri);
    } 

    pub fn total_supply(&self) -> U256 {
        self.counter.get()
    }

    pub fn balance_of(&self, owner: Address) -> Result<U256, Error> {
        if owner.is_zero() {
            return Err(ERC721InvalidOwner { owner: Address::ZERO }.into());
        }
        Ok(self._balances.get(owner))
    }

    /* fn owner_of(&self, token_id: U256) -> Result<Address, Error> {
        self._require_owned(token_id)
    } */

    pub fn _owner_of(&self, token_id: U256) -> Address {
        self._owners.get(token_id)
    }

    pub fn _require_owned(&self, token_id: U256) -> Result<Address, Error> {
        let owner = self._owner_of(token_id);
        if owner.is_zero() {
            return Err(ERC721NonexistentToken { token_id }.into());
        }
        Ok(owner)
    }

    pub fn _mint(&mut self, to: Address, token_id: U256) -> Result<(), Error> {
        if to.is_zero() {
            return Err(
                ERC721InvalidReceiver { receiver: Address::ZERO }.into()
            );
        }

        let previous_owner = self._update(to, token_id, Address::ZERO)?;
        if !previous_owner.is_zero() {
            return Err(ERC721InvalidSender { sender: Address::ZERO }.into());
        }
        Ok(())
    }

    pub fn mint_token(&mut self, to: Address, token_uri: String) -> Result<(), Error> {
        let old_counter = self.counter.get();
        self.counter.set(old_counter + U256::from(1));
        let new_counter = self.counter.get();
        self._mint(to, new_counter);
        self._token_uris.setter(new_counter).set_str(token_uri);
        Ok(())
    }

    

    pub fn _check_authorized(
        &self,
        owner: Address,
        operator: Address,
        token_id: U256,
    ) -> Result<(), Error> {
        if self._is_authorized(owner, operator, token_id) {
            return Ok(());
        }

        if owner.is_zero() {
            Err(ERC721NonexistentToken { token_id }.into())
        } else {
            Err(ERC721InsufficientApproval { operator, token_id }.into())
        }
    }

    pub fn _is_authorized(
        &self,
        owner: Address,
        spender: Address,
        token_id: U256,
    ) -> bool {
        !spender.is_zero()
            && (owner == spender
                || self.is_approved_for_all(owner, spender)
                || self._get_approved(token_id) == spender)
    }

    fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool {
        self._operator_approvals.get(owner).get(operator)
    }

    pub fn _get_approved(&self, token_id: U256) -> Address {
        self._token_approvals.get(token_id)
    }
    
    pub fn _approve(
        &mut self,
        to: Address,
        token_id: U256,
        auth: Address,
        emit_event: bool,
    ) -> Result<(), Error> {
        // Avoid reading the owner unless necessary.
        if emit_event || !auth.is_zero() {
            let owner = self._require_owned(token_id)?;

            // We do not use [`Self::_is_authorized`] because single-token
            // approvals should not be able to call `approve`.
            if !auth.is_zero()
                && owner != auth
                && !self.is_approved_for_all(owner, auth)
            {
                return Err(ERC721InvalidApprover { approver: auth }.into());
            }

            if emit_event {
                evm::log(Approval { owner, approved: to, token_id });
            }
        }

        self._token_approvals.setter(token_id).set(to);
        Ok(())
    }

    pub fn _update(
        &mut self,
        to: Address,
        token_id: U256,
        auth: Address,
    ) -> Result<Address, Error> {
        let from = self._owner_of(token_id);

        // Perform (optional) operator check.
        if !auth.is_zero() {
            self._check_authorized(from, auth, token_id)?;
        }

        // Execute the update.
        if !from.is_zero() {
            // Clear approval. No need to re-authorize or emit the `Approval`
            // event.
            self._approve(Address::ZERO, token_id, Address::ZERO, false)?;
            self._balances.setter(from).sub_assign_unchecked(uint!(1_U256));
        }

        if !to.is_zero() {
            self._balances.setter(to).add_assign_unchecked(uint!(1_U256));
        }

        self._owners.setter(token_id).set(to);
        evm::log(Transfer { from, to, token_id });
        Ok(from)
    }
}