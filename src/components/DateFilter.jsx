import { useState } from 'react';
import { Box, HStack, Button, Badge, Dialog, Portal, VStack, Input, Field, CloseButton } from '@chakra-ui/react';
import { CalendarDays } from 'lucide-react';

const DateFilter = ({ value, onChange }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const presets = [
    {
      label: 'This Month',
      getValue: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0), label: 'This Month' };
      }
    },
    {
      label: 'Last Month',
      getValue: () => {
        const now = new Date();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0), label: 'Last Month' };
      }
    },
    {
      label: 'This Year',
      getValue: () => {
        const now = new Date();
        const year = now.getFullYear();
        return { from: new Date(year, 0, 1), to: new Date(year, 11, 31), label: 'This Year' };
      }
    }
  ];

  const handlePresetClick = (preset) => onChange(preset.getValue());

  const handleCustomRangeClick = () => {
    if (value?.from && value?.to) {
      setCustomFrom(value.from.toISOString().split('T')[0]);
      setCustomTo(value.to.toISOString().split('T')[0]);
    } else {
      setCustomFrom('2025-09-01');
      setCustomTo(new Date().toISOString().split('T')[0]);
    }
    setDialogOpen(true);
  };

  const handleApplyCustomRange = () => {
    if (customFrom && customTo) {
      const fromDate = new Date(customFrom);
      const toDate = new Date(customTo);
      if (fromDate <= toDate) {
        onChange({
          from: fromDate,
          to: toDate,
          label: `${fromDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${toDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
        });
        setDialogOpen(false);
      }
    }
  };

  return (
    <>
      <Box bg="#22252A" p={4} rounded="lg" border="1px solid" borderColor="#343840" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
        <HStack gap={3} flexWrap="wrap" justify="space-between" align="center">
          <HStack gap={2}>
            <CalendarDays size={18} color="#2E9BD6" />
            <Badge bg="rgba(120,197,245,0.12)" color="#2E9BD6" fontSize="sm" px={3} py={1} rounded="full" border="1px solid" borderColor="#2E9BD6" fontWeight="600">
              {value?.label || 'Select Period'}
            </Badge>
          </HStack>
          <HStack gap={2} flexWrap="wrap">
            {presets.map((preset) => {
              const isActive = value?.label === preset.label;
              return (
                <Button
                  key={preset.label}
                  size="sm"
                  bg={isActive ? '#2E9BD6' : 'transparent'}
                  color={isActive ? 'white' : '#8A9099'}
                  border="1px solid"
                  borderColor={isActive ? '#2E9BD6' : '#343840'}
                  _hover={{ bg: isActive ? '#1A6FA8' : '#2A2E35', borderColor: '#2E9BD6' }}
                  onClick={() => handlePresetClick(preset)}
                  transition="all 0.2s"
                  fontWeight="600"
                  rounded="lg"
                >
                  {preset.label}
                </Button>
              );
            })}
            <Button
              size="sm"
              bg="transparent"
              color="#8A9099"
              border="1px solid"
              borderColor="#343840"
              _hover={{ bg: '#2A2E35', borderColor: '#2E9BD6' }}
              onClick={handleCustomRangeClick}
              transition="all 0.2s"
              fontWeight="600"
              rounded="lg"
            >
              <CalendarDays size={15} />
              Custom Range
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Dialog.Root open={dialogOpen} onOpenChange={(e) => setDialogOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.800" />
          <Dialog.Positioner>
            <Dialog.Content bg="#22252A" rounded="lg" border="1px solid" borderColor="#343840" boxShadow="0 24px 60px rgba(0,0,0,0.6)" maxW="md" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
              <Dialog.Header borderBottom="1px solid" borderColor="#343840" pb={4}>
                <Dialog.Title fontSize="lg" fontWeight="600" color="#ECEEF0">Custom Date Range</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body pt={5}>
                <VStack gap={4} align="stretch">
                  <Field.Root>
                    <Field.Label fontWeight="600" color="#8A9099" fontSize="xs" textTransform="uppercase">From Date</Field.Label>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      bg="#1A1C20"
                      border="1px solid"
                      borderColor="#343840"
                      color="#ECEEF0"
                      rounded="lg"
                      _focus={{ borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' }}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="600" color="#8A9099" fontSize="xs" textTransform="uppercase">To Date</Field.Label>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      bg="#1A1C20"
                      border="1px solid"
                      borderColor="#343840"
                      color="#ECEEF0"
                      rounded="lg"
                      _focus={{ borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' }}
                    />
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer borderTop="1px solid" borderColor="#343840" pt={4}>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" color="#8A9099" borderColor="#343840" _hover={{ bg: '#2A2E35' }}>Cancel</Button>
                </Dialog.ActionTrigger>
                <Button
                  bg="#2E9BD6"
                  color="white"
                  fontWeight="600"
                  _hover={{ bg: '#1A6FA8' }}
                  onClick={handleApplyCustomRange}
                  disabled={!customFrom || !customTo}
                >
                  Apply Range
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" color="#8A9099" _hover={{ color: '#ECEEF0' }} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
};

export default DateFilter;
