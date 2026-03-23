import { Box, VStack, HStack, Text, Badge } from '@chakra-ui/react';
import { Clock, TrendingUp, BarChart3 } from 'lucide-react';

const BillingBreakdown = ({ totalHours = 0, rolloverHours = 0, rolloverMonth = '', monthCount = 1 }) => {
  const currentHours = totalHours;
  const totalBillable = rolloverHours + currentHours;
  const hasRollover = rolloverHours > 0 && monthCount === 1;

  return (
    <Box
      bg="#22252A"
      p={8}
      rounded="24px"
      border="1px solid"
      borderColor="#343840"
      _hover={{ borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' }}
      transition="all 0.2s"
      fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
    >
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" fontWeight="600" color="#565C66" textTransform="uppercase" letterSpacing="0.1em">
              Hours Breakdown
            </Text>
            <Text fontSize="2xl" fontWeight="300" color="#ECEEF0" letterSpacing="-0.02em">
              Invoice Split
            </Text>
          </VStack>
          <Box w="12" h="12" bg="rgba(120,197,245,0.08)" rounded="lg" border="1px solid rgba(120,197,245,0.15)" display="flex" alignItems="center" justifyContent="center">
            <BarChart3 size={22} color="#78C5F5" />
          </Box>
        </HStack>

        {hasRollover && (
          <VStack gap={3} align="stretch" p={4} bg="rgba(245,240,144,0.06)" rounded="lg" border="1px solid rgba(212,200,64,0.2)">
            <HStack justify="space-between">
              <HStack gap={2}>
                <TrendingUp size={16} color="#D4C840" />
                <Text fontSize="sm" fontWeight="600" color="#D4C840">Rollover from {rolloverMonth}</Text>
              </HStack>
              <Badge bg="rgba(245,240,144,0.12)" color="#D4C840" border="1px solid rgba(212,200,64,0.3)" fontSize="xs" fontWeight="600">Previous</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#8A9099">Hours:</Text>
              <Text fontSize="2xl" fontWeight="300" color="#D4C840">+{rolloverHours.toFixed(1)}h</Text>
            </HStack>
          </VStack>
        )}

        <VStack gap={3} align="stretch" p={4} bg="rgba(120,197,245,0.05)" rounded="lg" border="1px solid rgba(46,155,214,0.15)">
          <HStack justify="space-between">
            <HStack gap={2}>
              <Clock size={16} color="#2E9BD6" />
              <Text fontSize="sm" fontWeight="600" color="#2E9BD6">Hours Logged</Text>
            </HStack>
            <Badge bg="rgba(120,197,245,0.12)" color="#2E9BD6" border="1px solid rgba(46,155,214,0.3)" fontSize="xs" fontWeight="600">Now</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="#8A9099">This Period:</Text>
            <Text fontSize="2xl" fontWeight="300" color="#2E9BD6">{currentHours.toFixed(1)}h</Text>
          </HStack>
        </VStack>

        <Box pt={4} borderTop="1px solid" borderColor="#343840">
          <HStack justify="space-between" align="center">
            <Text fontSize="md" fontWeight="600" color="#8A9099">Total Billable:</Text>
            <Text fontSize="3xl" fontWeight="300" color="#ECEEF0" letterSpacing="-0.03em">{totalBillable.toFixed(1)}h</Text>
          </HStack>
          {hasRollover && (
            <Text fontSize="xs" color="#565C66" textAlign="right" mt={1}>
              ({rolloverHours.toFixed(1)}h rollover + {currentHours.toFixed(1)}h current)
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default BillingBreakdown;
