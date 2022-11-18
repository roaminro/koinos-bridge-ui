import { Dispatch, SetStateAction, useEffect } from 'react'
import { Box, FormControl, FormLabel, NumberInput, NumberInputField, Text } from '@chakra-ui/react'
import { useContractRead, useAccount as useEthereumAccount } from 'wagmi'
import { utils } from 'koilib'

import { useAccount as useKoinosAccount } from '../context/AccountProvider'

import { State } from '../pages'
import Section from './Section'

interface AmountProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function Amount({ state, setState }: AmountProps) {

  const { address: ethereumAddress } = useEthereumAccount()
  const { account: koinosAddress } = useKoinosAccount()


  const handleAmountChange = (amount: string, _: number): void => {
    setState({ ...state, amount })
  }

  const { data: ethTokenBalanceData } = useContractRead({
    address: state.asset.ethereumAddress,
    abi: [
      {
        'inputs': [
          {
            'internalType': 'address',
            'name': 'account',
            'type': 'address'
          }
        ],
        'name': 'balanceOf',
        'outputs': [
          {
            'internalType': 'uint256',
            'name': '',
            'type': 'uint256'
          }
        ],
        'stateMutability': 'view',
        'type': 'function'
      },
    ],
    args: ethereumAddress ? [ethereumAddress] : undefined,
    functionName: 'balanceOf',
    enabled: !!ethereumAddress
  })

  useEffect(() => {
    if (ethTokenBalanceData) {
      setState((state) => ({
        ...state,
        ethereumTokenBalance: utils.formatUnits(ethTokenBalanceData.toString(), state.asset.ethDecimals)
      }))
    }

  }, [ethTokenBalanceData, setState])

  useEffect(() => {
    setState((state) => {
      let formattedAmount = '0'

      if (state.chainFrom.id === 'koinos') {
        formattedAmount = utils.parseUnits(state.amount, state.asset.koinosDecimals)
      } else if (state.chainFrom.id === 'ethereum') {
        formattedAmount = utils.parseUnits(state.amount, state.asset.ethDecimals)
      }

      return {
        ...state,
        formattedAmount
      }
    })
  }, [setState, state.amount])

  useEffect(() => {
    if (koinosAddress) {
      const getBalance = async (owner: string) => {
        const { result: balanceOfResult } = await state.koinosTokenContract.functions.balanceOf<{ value: string }>({
          owner
        })

        return utils.formatUnits(balanceOfResult?.value!, state.asset.koinosDecimals)
      }

      getBalance(koinosAddress)
        .then(balance => {
          setState((state) => ({
            ...state,
            koinosTokenBalance: balance
          }))
        })
    }

  }, [koinosAddress, state.koinosTokenContract.functions, state.asset.koinosDecimals, setState])

  return (
    <Section heading="4. Enter the amount to transfer">
      <Box>
        <FormControl>
          <FormLabel htmlFor='amount'>Amount:</FormLabel>
          <NumberInput
            id='amount'
            value={state.amount}
            onChange={handleAmountChange}
            precision={8}
            min={0}
            size="lg"
          >
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <br />
        <Text>Ethereum Balance: {state.ethereumTokenBalance} {state.asset.symbol}</Text>
        <Text>Koinos Balance: {state.koinosTokenBalance} {state.asset.symbol}</Text>
      </Box>
    </Section>
  )
}