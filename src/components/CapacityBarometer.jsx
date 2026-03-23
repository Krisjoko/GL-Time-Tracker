import { Box, VStack, Text, HStack, Badge, Center } from '@chakra-ui/react';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const CapacityBarometer = ({ totalHours = 0, monthCount = 1 }) => {
  const SCALE_MAX = 250;
  const MIN_TARGET = 160;
  const MAX_CAP = 180;

  const minTarget = monthCount * MIN_TARGET;
  const maxCap = monthCount * MAX_CAP;
  const scaleMax = monthCount * SCALE_MAX;

  const minPct = (minTarget / scaleMax) * 100;  // always 64%
  const maxPct = (maxCap / scaleMax) * 100;      // always 72%
  const filledPct = Math.min((totalHours / scaleMax) * 100, 100);

  const getStatus = () => {
    if (totalHours >= maxCap) return {
      label: 'Over Capacity',
      color: '#E8856A',
      bgColor: 'rgba(232,133,106,0.10)',
      icon: AlertTriangle
    };
    if (totalHours >= minTarget) return {
      label: 'Buffer Zone',
      color: '#D4C840',
      bgColor: 'rgba(212,200,64,0.10)',
      icon: TrendingUp
    };
    return {
      label: 'On Track',
      color: '#2E9BD6',
      bgColor: 'rgba(46,155,214,0.10)',
      icon: CheckCircle
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  const toTarget = Math.max(minTarget - totalHours, 0);
  const toMax = Math.max(maxCap - totalHours, 0);
  const overMax = Math.max(totalHours - maxCap, 0);

  return (
    <Box
      bg="#22252A"
      p={8}
      rounded="24px"
      border="1px solid"
      borderColor={totalHours >= maxCap ? 'rgba(232, 133, 106, 0.4)' : '#343840'}
      _hover={{ borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' }}
      transition="all 0.2s"
      fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
    >
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" fontWeight="600" color="#565C66" textTransform="uppercase" letterSpacing="0.1em">
              Capacity Status
            </Text>
            <Text fontSize="3xl" fontWeight="300" color="#ECEEF0" letterSpacing="-0.02em">
              {totalHours.toFixed(1)}h
            </Text>
          </VStack>
          <Center
            w="12"
            h="12"
            bg={totalHours >= maxCap ? 'rgba(232, 133, 106, 0.12)' : status.bgColor}
            rounded="lg"
            border="1.5px solid"
            borderColor={totalHours >= maxCap ? 'rgba(232, 133, 106, 0.3)' : status.color}
          >
            <Icon size={22} color={status.color} />
          </Center>
        </HStack>

        <Box position="relative" pt={10} pb={8}>
          <Box position="absolute" left={`${minPct}%`} transform="translateX(-50%)" top="-4px" display="flex" flexDirection="column" alignItems="center" gap="4px">
            <Text fontSize="11px" color="#D4C840" fontWeight="700" lineHeight="1.2">160h</Text>
            <Text fontSize="9px" color="#565C66" fontWeight="500" lineHeight="1.2">min</Text>
          </Box>

          <Box position="relative" h="10px" rounded="full" overflow="hidden" bg="#1E2126">
            <Box position="absolute" left="0" top="0" h="full" w={`${minPct}%`} bg="rgba(46,155,214,0.15)" />
            <Box position="absolute" left={`${minPct}%`} top="0" h="full" w={`${maxPct - minPct}%`} bg="rgba(212,200,64,0.15)" />
            <Box position="absolute" left={`${maxPct}%`} top="0" h="full" w={`${100 - maxPct}%`} bg="rgba(232,133,106,0.15)" />
            <Box position="absolute" left="0" top="0" h="full" w={`${Math.min(filledPct, minPct)}%`} bg="#2E9BD6" rounded="full" transition="width 0.4s ease" />
            {totalHours > minTarget && (
              <Box position="absolute" left={`${minPct}%`} top="0" h="full" w={`${Math.min(filledPct - minPct, maxPct - minPct)}%`} bg="#D4C840" transition="width 0.4s ease" />
            )}
            {totalHours > maxCap && (
              <Box position="absolute" left={`${maxPct}%`} top="0" h="full" w={`${Math.min(filledPct - maxPct, 100 - maxPct)}%`} bg="#E8856A" transition="width 0.4s ease" />
            )}
            <Box position="absolute" left={`${minPct}%`} top="-2px" w="1.5px" h="14px" bg="#D4C840" opacity={0.8} transform="translateX(-50%)" zIndex={2} />
            <Box position="absolute" left={`${maxPct}%`} top="-2px" w="1.5px" h="14px" bg="#E8856A" opacity={0.6} transform="translateX(-50%)" zIndex={2} />
          </Box>

          <Text position="absolute" left="0" bottom="0" fontSize="10px" color="#565C66" fontWeight="600">0h</Text>
          <Box position="absolute" left={`${maxPct}%`} transform="translateX(-50%)" bottom="-4px" display="flex" flexDirection="column" alignItems="center" gap="4px">
            <Text fontSize="9px" color="#565C66" fontWeight="500" lineHeight="1.2">max</Text>
            <Text fontSize="11px" color="#E8856A" fontWeight="700" lineHeight="1.2">180h</Text>
          </Box>
        </Box>

        <Badge
          bg={status.bgColor}
          color={status.color}
          border="1px solid"
          borderColor={status.color}
          px={3}
          py={1.5}
          rounded="full"
          fontSize="sm"
          fontWeight="600"
          alignSelf="flex-start"
        >
          <HStack gap={2}>
            <Icon size={13} color={status.color} />
            <Text>{status.label}</Text>
          </HStack>
        </Badge>

        <VStack gap={0} align="stretch" borderTop="1px solid" borderColor="#343840" pt={4}>
          <HStack justify="space-between" py={2.5} borderBottom="1px solid" borderColor="#2A2E35">
            <Text fontSize="xs" color="#8A9099" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">
              To Min (160h)
            </Text>
            <Text fontSize="lg" fontWeight="700" color={toTarget === 0 ? '#2E9BD6' : '#ECEEF0'}>
              {toTarget === 0 ? '✓ Reached' : `${toTarget.toFixed(1)}h`}
            </Text>
          </HStack>
          <HStack justify="space-between" py={2.5} borderBottom="1px solid" borderColor="#2A2E35">
            <Text fontSize="xs" color="#8A9099" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">
              To Max (180h)
            </Text>
            <Text fontSize="lg" fontWeight="700" color={toMax === 0 ? '#E8856A' : '#ECEEF0'}>
              {toMax === 0 ? `+${overMax.toFixed(1)}h over` : `${toMax.toFixed(1)}h`}
            </Text>
          </HStack>
          <HStack justify="space-between" py={2.5}>
            <Text fontSize="xs" color="#8A9099" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">
              Target Range
            </Text>
            <Text fontSize="xs" color="#8A9099" fontWeight="600">
              {minTarget}h – {maxCap}h{monthCount > 1 ? ` (${monthCount}mo)` : ''}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
};

export default CapacityBarometer;
