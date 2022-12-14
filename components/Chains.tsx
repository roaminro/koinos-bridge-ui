import { Dispatch, SetStateAction, useEffect } from 'react'
import { FormControl, FormLabel, Select } from '@chakra-ui/react'
import { useAccount as useEthereumAccount } from 'wagmi'

import { useAccount as useKoinosAccount } from '../context/AccountProvider'
import { State, chains } from '../pages'
import Section from './Section'

interface ChainsProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function Chains({ state, setState }: ChainsProps) {

  const { address: ethereumAddress } = useEthereumAccount()
  const { account: koinosAddress } = useKoinosAccount()

  const handleChainFromChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    switch (event.target.value) {
      case 'koinos': {
        setState({
          ...state,
          chainFrom: chains['koinos'],
          chainTo: chains['ethereum'],
          recipient: ethereumAddress
        })
        break
      }
      case 'ethereum': {
        setState({
          ...state,
          chainFrom: chains['ethereum'],
          chainTo: chains['koinos'],
          recipient: koinosAddress
        })
        break
      }
      default:
        break
    }
  }

  return (
    <Section heading="2. Choose the chain to transfer from">
      <FormControl>
        <FormLabel>Chain:</FormLabel>
        <Select
          value={state.chainFrom.id}
          onChange={handleChainFromChange}
        >
          <option value="koinos">Koinos</option>
          <option value="ethereum">Ethereum</option>
        </Select>
      </FormControl>
    </Section>
  )
}