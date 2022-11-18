import { TransactionInfo } from '../pages'

const LAST_INIATED_TRANSACTION_ID_KEY = 'LAST_INIATED_TRANSACTION_ID_KEY'
const TRANSACTIONS_HISTORY_KEY = 'TRANSACTIONS_HISTORY_KEY'

export function setLastInitiatedTransactionId(transactionId: string) {
  localStorage.setItem(LAST_INIATED_TRANSACTION_ID_KEY, transactionId)
}

export function getLastInitiatedTransactionId() {
  return localStorage.getItem(LAST_INIATED_TRANSACTION_ID_KEY)
}

export function setTransactionsHistory(transactions: TransactionInfo[]) {
  localStorage.setItem(TRANSACTIONS_HISTORY_KEY, JSON.stringify(transactions))
}

export function getTransactionsHistory(): TransactionInfo[] {
  const transactions = localStorage.getItem(TRANSACTIONS_HISTORY_KEY)

  if (transactions) {
    return JSON.parse(transactions)
  }

  return []
}