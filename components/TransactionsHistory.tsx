import { Dispatch, SetStateAction, useEffect } from 'react'
import { Box, Link, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'

import { State } from '../pages'
import Section from './Section'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { getTransactionsHistory, setTransactionsHistory } from '../util/local_storage'

interface TransactionsHistoryProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

const truncate = (input: string) => input && input !== '0x' ? `${input.substring(0, 11)}...${input.substring(input.length - 5, input.length)}` : ''

export default function TransactionsHistory({ state, setState }: TransactionsHistoryProps) {

  useEffect(() => {
    if (!state.transactionsHistory.length) {
      const transactionsHistory = getTransactionsHistory()
      if (transactionsHistory.length) {
        setState((state) => ({
          ...state,
          transactionsHistory
        }))
      }
    } else {
      setTransactionsHistory(state.transactionsHistory)
    }
  }, [setState, state.transactionsHistory])

  console.log('test', state.transactionsHistory)

  return (
    <Section heading="Transactions History">
      <Box>
        <TableContainer>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>Transaction Id</Th>
                <Th>Chain</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
              </Tr>
            </Thead>
            <Tbody>
              {
                state.transactionsHistory.map((transaction) => {
                  let link = ''
                  if (transaction.chain === 'koinos') {
                    link = `https://koinosblocks.com/tx/${transaction.id}`
                  } else if (transaction.chain === 'ethereum') {
                    link = `https://goerli.etherscan.io/tx/${transaction.id}`
                  }

                  return (
                    <Tr key={transaction.id}>
                      <Td>
                        <Link href={link} isExternal>
                          {truncate(transaction.id)} <ExternalLinkIcon mx='2px' />
                        </Link>
                      </Td>
                      <Td>{transaction.chain}</Td>
                      <Td>{transaction.type}</Td>
                      <Td>{transaction.date}</Td>
                      <Td>{transaction.amount}</Td>
                    </Tr>
                  )
                })
              }
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </Section>
  )
}