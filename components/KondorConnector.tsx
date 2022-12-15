import { Button, Text, Tooltip, useToast } from '@chakra-ui/react'
import { useAccount } from '../context/AccountProvider'
import { createAvatar } from '@dicebear/avatars'
import * as identiconStyle from '@dicebear/avatars-identicon-sprites'

interface ConnectorProps {
  onConnect?: () => void;
  size?: string;
  connectedVariant?: JSX.Element;
}

export default function KondorConnector({
  onConnect,
  size = 'md',
  connectedVariant,
}: ConnectorProps) {
  const { account, isConnecting, connectedWithKondor, connectWithKondor, connectWithMyKoinosWallet } = useAccount()
  const toast = useToast()

  const connectWithKondorClick = async () => {
    const connected = await connectWithKondor()

    if (!connected) {
      toast({
        title: 'Failed to connect with Kondor',
        description: 'Please check that you have Kondor installed in this browser and try again.',
        status: 'error',
        isClosable: true,
      })
      return
    }

    if (onConnect) {
      onConnect()
    }
  }

  const connectWithMyKoinosWalletClick = async () => {
    const connected = await connectWithMyKoinosWallet()

    if (!connected) {
      toast({
        title: 'Failed to connect with Koinos Wallet',
        description: 'Connection to Koinos Wallet canceled.',
        status: 'error',
        isClosable: true,
      })
      return
    }

    if (onConnect) {
      onConnect()
    }
  }

  const identicon = createAvatar(identiconStyle, { seed: account })

  return account ? (
    connectedVariant || (
      <Tooltip
        label={
          isConnecting ? (
            'Connecting to Kondor...'
          ) : (
            <>
              <Text>{account}</Text>
              <Text>Click to connect a different address</Text>
            </>
          )
        }
        placement="bottom"
        hasArrow
      >
        <Button
          onClick={connectedWithKondor ? connectWithKondorClick : connectWithMyKoinosWalletClick}
          variant="outline"
          isLoading={isConnecting}
          minWidth="unset"
          fontWeight="normal"
          size={size}
        >
          <span
            dangerouslySetInnerHTML={{ __html: identicon }}
            style={{
              display: 'block',
              width: '18px',
              height: '18px',
              marginRight: '10px',
            }}
          />{' '}
          {account.substring(0, 4)}...{account.substring(account.length - 4)}
        </Button>
      </Tooltip>
    )
  ) : (
    <>
      <Button
        onClick={connectWithKondorClick}
        variant="solid"
        isLoading={isConnecting}
        minWidth="unset"
        fontWeight="bold"
        colorScheme="blue"
        size={size}
      >
        Connect with Kondor
      </Button>
      { ' ' }
      <Button
        onClick={connectWithMyKoinosWalletClick}
        variant="solid"
        isLoading={isConnecting}
        minWidth="unset"
        fontWeight="bold"
        colorScheme="blue"
        size={size}
      >
        Connect with My Koinos Wallet
      </Button>
    </>
  )
}