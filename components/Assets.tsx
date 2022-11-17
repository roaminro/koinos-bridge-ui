import { Dispatch, SetStateAction } from 'react'
import { Box, FormControl, FormLabel, Select } from '@chakra-ui/react'
import { Contract, utils } from 'koilib'

import { State, assets } from '../pages'
import Section from './Section'

interface AssetsProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function Assets({ state, setState }: AssetsProps) {

  const handleAssetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setState({
      ...state,
      asset: assets[event.target.value],
      koinosTokenBalance: '0',
      ethereumTokenBalance: '0',
      amount: '0',
      koinosTokenContract: new Contract({
        id: assets[event.target.value].koinosAddress,
        abi: utils.tokenAbi,
        provider: state.koinosProvider,
      })
    })
  }

  return (
    <Section heading="3. Select the asset to transfer">
          <Box>
            <FormControl>
              <FormLabel>Asset:</FormLabel>
              <Select
                value={state.asset.id}
                onChange={handleAssetChange}
              >
                {
                  Object.keys(assets).map((key) => (
                    <option key={key} value={key} >{assets[key].name} ({assets[key].symbol})</option>
                  ))
                }
              </Select>
            </FormControl>
          </Box>
        </Section>
  )
}