import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Stack,
  Box,
  Collapse,
  useDisclosure,
  useToast,
  Icon,
} from '@chakra-ui/core'
import {useMachine} from '@xstate/react'
import {useRouter} from 'next/router'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'
import {Page, PageTitle} from '../../screens/app/components'
import {
  Checkbox,
  FloatDebug,
  Input,
  SuccessAlert,
  Textarea,
  Toast,
} from '../../shared/components/components'
import {PrimaryButton} from '../../shared/components/button'
import {createNewVotingMachine} from '../../screens/oracles/machines'
import {
  DnaInput,
  NewVotingFormSkeleton,
  NewOracleFormHelperText,
  VotingInlineFormControl,
  VotingOptionInput,
  InputWithRightAddon,
  NewVotingFormSubtitle,
} from '../../screens/oracles/components'
import {useAppMachine} from '../../shared/providers/app-context'
import {
  minOracleReward,
  votingMinBalance,
  votingMinStake,
  durationPreset,
} from '../../screens/oracles/utils'
import {eitherState, toLocaleDna} from '../../shared/utils/utils'
import {
  ReviewVotingDrawer,
  VotingDurationInput,
} from '../../screens/oracles/containers'
import {VotingStatus} from '../../shared/types'

dayjs.extend(duration)
dayjs.extend(relativeTime)

function NewVotingPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const toast = useToast()

  const {isOpen: isOpenAdvanced, onToggle: onToggleAdvanced} = useDisclosure()

  const {
    isOpen: isOpenCustomDuration,
    onToggle: onToggleCustomDuration,
  } = useDisclosure()

  const {
    isOpen: isOpenCustomPublicDuration,
    onToggle: onToggleCustomPublicDuration,
  } = useDisclosure()

  const [
    {
      context: {
        epoch: {epoch},
        identity: {address, balance},
      },
    },
  ] = useAppMachine()

  const newVotingMachine = React.useMemo(
    () => createNewVotingMachine(epoch, address),
    [address, epoch]
  )

  const [current, send] = useMachine(newVotingMachine, {
    actions: {
      onDone: ({shouldStartImmediately: didStart}) => {
        toast({
          // eslint-disable-next-line react/display-name
          render: () => (
            <Toast
              title={t(`Deployed ${didStart && 'and started'} sir`)}
              status="error"
            />
          ),
        })
        if (Math.random() > 1) router.push('/oracles/list')
      },
      onError: (_, {data: {message}}) => {
        toast({
          // eslint-disable-next-line react/display-name
          render: () => <Toast title={message} status="error" />,
        })
      },
    },
  })

  const {
    votingDuration,
    publicVotingDuration,
    options,
    shouldStartImmediately,
    isFreeVoting,
    committeeSize,
    quorum,
    oracleReward,
    feePerGas,
    isWholeNetwork,
  } = current.context

  const handleChange = ({target: {id, value}}) => send('CHANGE', {id, value})
  const dna = toLocaleDna(i18n)

  return (
    <Page p={0}>
      <Box px={20} py={6} w="full" overflowY="auto">
        <PageTitle mb={0}>{t('New voting')}</PageTitle>
        <SuccessAlert my={8}>
          {t(
            'After publishing or launching, you will not be able to edit the voting parameters.'
          )}
        </SuccessAlert>

        {current.matches('preload.late') && <NewVotingFormSkeleton />}

        {!current.matches('preload') && (
          <Stack spacing={3} w="xl">
            <VotingInlineFormControl
              id="title"
              label={t('Title')}
              onChange={handleChange}
            />

            <VotingInlineFormControl label={t('Description')}>
              <Textarea id="desc" w="md" h={32} onChange={handleChange} />
            </VotingInlineFormControl>

            <VotingInlineFormControl label={t('Voting options')}>
              <Box
                borderWidth={1}
                borderColor="gray.300"
                borderRadius="md"
                p={1}
                w="md"
              >
                {options.map(({id, value}, idx) => (
                  <VotingOptionInput
                    key={id}
                    value={value}
                    placeholder={`${t('Option')} ${idx + 1}...`}
                    isLast={idx === options.length - 1}
                    onChange={({target}) => {
                      send('SET_OPTIONS', {id, value: target.value})
                    }}
                    onAddOption={() => {
                      send('ADD_OPTION')
                    }}
                    onRemoveOption={() => {
                      send('REMOVE_OPTION', {id})
                    }}
                  />
                ))}
              </Box>
            </VotingInlineFormControl>

            <VotingInlineFormControl
              id="startDate"
              label={t('Start date')}
              isDisabled={shouldStartImmediately}
              mt={4}
            >
              <Stack spacing={3} flex={1}>
                <Input
                  id="startDate"
                  type="datetime-local"
                  onChange={handleChange}
                />
                <Checkbox
                  id="shouldStartImmediately"
                  onChange={({target: {id, checked}}) => {
                    send('CHANGE', {id, value: checked})
                  }}
                >
                  {t('Start now')}
                </Checkbox>
              </Stack>
            </VotingInlineFormControl>

            <VotingDurationInput
              id="votingDuration"
              label={t('Voting duration')}
              value={votingDuration}
              presets={[
                durationPreset({hours: 12}),
                durationPreset({days: 1}),
                durationPreset({days: 2}),
                durationPreset({days: 5}),
                durationPreset({weeks: 1}),
              ]}
              onChangePreset={value => {
                send('CHANGE', {id: 'votingDuration', value})
              }}
              onChangeCustom={({target}) => {
                send('CHANGE', {
                  id: 'votingDuration',
                  value: Number(target.value),
                })
              }}
              onToggleCustom={onToggleCustomDuration}
              isOpenCustom={isOpenCustomDuration}
              mt={2}
            />

            <NewVotingFormSubtitle>
              {t('Oracles requirements')}
            </NewVotingFormSubtitle>

            <VotingInlineFormControl
              id="committeeSize"
              label={t('Committee size')}
              mt={2}
            >
              <Stack spacing={3} flex={1}>
                <Input
                  id="committeeSize"
                  type="number"
                  value={committeeSize}
                  isDisabled={isWholeNetwork}
                  onChange={handleChange}
                />
                <Checkbox
                  id="isWholeNetwork"
                  onChange={({target: {checked}}) => {
                    send('SET_WHOLE_NETWORK', {checked})
                  }}
                >
                  {t('Whole network')}
                </Checkbox>
              </Stack>
            </VotingInlineFormControl>

            <VotingInlineFormControl
              id="quorum"
              label={t('Quorum')}
              mt={2}
              onChange={handleChange}
            >
              <Stack spacing={0} flex={1}>
                <InputWithRightAddon
                  id="quorum"
                  type="number"
                  defaultValue={20}
                  addon="%"
                  onChange={handleChange}
                />
                <NewOracleFormHelperText textAlign="right">
                  {t('{{count}} votes are required', {
                    count: Math.ceil((committeeSize * quorum) / 100),
                  })}
                </NewOracleFormHelperText>
              </Stack>
            </VotingInlineFormControl>

            <VotingInlineFormControl
              id="votingMinPayment"
              label={t('Voting deposit')}
              isDisabled={isFreeVoting}
              mt={2}
            >
              <Stack spacing={3} flex={1}>
                <DnaInput
                  addon="iDNA"
                  isDisabled={isFreeVoting}
                  _disabled={{
                    bg: 'gray.50',
                  }}
                  onChange={handleChange}
                />
                <Checkbox
                  id="isFreeVoting"
                  onChange={({target: {id, checked}}) => {
                    send('CHANGE', {id, value: checked})
                  }}
                >
                  {t('Free voting')}
                </Checkbox>
              </Stack>
            </VotingInlineFormControl>

            <NewVotingFormSubtitle>{t('Rewards')}</NewVotingFormSubtitle>

            <VotingInlineFormControl
              id="oracleReward"
              label={t('Min reward per oracle')}
              mt={2}
            >
              <Stack spacing={0} flex={1}>
                <DnaInput
                  defaultValue={minOracleReward(feePerGas)}
                  min={minOracleReward(feePerGas)}
                  onChange={handleChange}
                />
                <NewOracleFormHelperText>
                  {t('Total oracles rewards: {{amount}}', {
                    amount: dna(
                      votingMinBalance({oracleReward, committeeSize, feePerGas})
                    ),
                    nsSeparator: '!',
                  })}
                </NewOracleFormHelperText>
              </Stack>
            </VotingInlineFormControl>

            <NewVotingFormSubtitle cursor="pointer" onClick={onToggleAdvanced}>
              {t('Advanced settings')}
              <Icon
                size={5}
                name="chevron-down"
                color="muted"
                ml={1}
                transform={isOpenAdvanced ? 'rotate(180deg)' : ''}
                transition="all 0.2s ease-in-out"
              />
            </NewVotingFormSubtitle>

            <Collapse isOpen={isOpenAdvanced} mt={2}>
              <Stack spacing={3}>
                <VotingDurationInput
                  id="publicVotingDuration"
                  label={t('Duration of summing up')}
                  value={publicVotingDuration}
                  presets={[
                    durationPreset({hours: 1}),
                    durationPreset({hours: 2}),
                    durationPreset({hours: 12}),
                    durationPreset({days: 1}),
                  ]}
                  onChangePreset={value => {
                    send('CHANGE', {id: 'publicVotingDuration', value})
                  }}
                  onChangeCustom={({target}) => {
                    send('CHANGE', {
                      id: 'publicVotingDuration',
                      value: Number(target.value),
                    })
                  }}
                  onToggleCustom={onToggleCustomPublicDuration}
                  isOpenCustom={isOpenCustomPublicDuration}
                  mt={2}
                />

                <VotingInlineFormControl
                  id="winnerThreshold"
                  label={t('Winner score')}
                >
                  <InputWithRightAddon
                    id="winnerThreshold"
                    addon="%"
                    type="number"
                    defaultValue={50}
                    flex={1}
                    onChange={handleChange}
                  />
                </VotingInlineFormControl>
              </Stack>
            </Collapse>
          </Stack>
        )}
      </Box>
      <Stack
        isInline
        mt="auto"
        alignSelf="stretch"
        justify="flex-end"
        borderTop="1px"
        borderTopColor="gray.300"
        py={3}
        px={4}
      >
        <PrimaryButton
          isLoading={current.matches('publishing')}
          loadingText={t('Publishing')}
          onClick={() => send('PUBLISH')}
        >
          {t('Publish')}
        </PrimaryButton>
      </Stack>

      <ReviewVotingDrawer
        isOpen={current.matches('publishing')}
        onClose={() => send('CANCEL')}
        from={address}
        available={balance}
        minBalance={votingMinBalance({oracleReward, committeeSize, feePerGas})}
        minStake={votingMinStake(feePerGas)}
        isLoading={eitherState(
          current,
          'publishing.deploy',
          `publishing.${VotingStatus.Starting}`
        )}
        // eslint-disable-next-line no-shadow
        onConfirm={({from, balance, stake}) =>
          send('CONFIRM', {from, balance, stake})
        }
      />

      <FloatDebug>{current.value}</FloatDebug>
    </Page>
  )
}

export default NewVotingPage
