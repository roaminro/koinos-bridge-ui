import { Dispatch, SetStateAction } from "react";
import { Box, FormControl, FormLabel, Input, NumberInput, NumberInputField, Switch, Text } from "@chakra-ui/react";

import { State } from "../pages";
import Section from "./Section";

interface RecipientProps {
  state: State,
  setState: Dispatch<SetStateAction<State>>
}

export default function Recipient({ state, setState }: RecipientProps) {

  const handleOverrideRecipientChange = (_: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      overrideRecipient: !state.overrideRecipient
    })
  }

  const handleRecipientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      recipient: event.target.value
    })
  }

  return (
    <Section heading="5. Enter the recipient">
      <Box>
        <FormControl>
          <FormLabel htmlFor='recipient'>Recipient:</FormLabel>
          <Input
            id='recipient'
            value={state.recipient}
            size="lg"
            disabled={!state.overrideRecipient}
            onChange={handleRecipientChange}
          />
        </FormControl>
        <FormControl display='flex' alignItems='center'>
          <FormLabel htmlFor='override-recipient' mb='0'>
            Override recipient
          </FormLabel>
          <Switch
            id='override-recipient'
            checked={state.overrideRecipient}
            onChange={handleOverrideRecipientChange}
          />
        </FormControl>
      </Box>
    </Section>
  )
}