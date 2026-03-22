import { Box, VStack, Text, HStack, Badge, Separator } from '@chakra-ui/react';
import { Calendar, Target, Clock, TrendingUp } from 'lucide-react';

const ContractContext = ({ totalHours = 0, dateRange = {}, nextMonthRollover = 0, monthCount = 1 }) => {
  const now = new Date();
  const isMultiMonth = monthCount > 1;
  const selectedDate = dateRange?.from ? new Date(dateRange.from) : now;
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();

  const getWorkingDays = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day).getDay();
      if (d !== 0 && d !== 6) workingDays++;
    }
    return workingDays;
  };

  const getDaysElapsed = (year, month) => {
    const today = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (year < currentYear || (year === currentYear && month < currentMonth)) return getWorkingDays(year, month);
    if (year === currentYear && month === currentMonth) {
      let elapsed = 0;
      for (let day = 1; day <= today; day++) {
        const d = new Date(year, month, day).getDay();
        if (d !== 0 && d !== 6) elapsed++;
      }
      return elapsed;
    }
    return 0;
  };

  const getCumulativeMetrics = () => {
    if (!isMultiMonth) {
      const workingDays = getWorkingDays(selectedYear, selectedMonth);
      const daysElapsed = getDaysElapsed(selectedYear, selectedMonth);
      const monthlyPotential = workingDays * 8;
      const cumulativeMax = 180;
      const remainingToMax = Math.max(cumulativeMax - totalHours, 0);
      const capacityRemaining = (remainingToMax / cumulativeMax) * 100;
      return { workingDays, daysElapsed, monthlyPotential, cumulativeMax, remainingToMax, capacityRemaining };
    }

    let totalWorkingDays = 0;
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      totalWorkingDays += getWorkingDays(currentDate.getFullYear(), currentDate.getMonth());
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    const cumulativePotential = totalWorkingDays * 8;
    const cumulativeMax = monthCount * 180;
    const remainingToMax = Math.max(cumulativeMax - totalHours, 0);
    const capacityRemaining = (remainingToMax / cumulativeMax) * 100;
    const contractOverload = Math.max(totalHours - cumulativeMax, 0);
    return { workingDays: totalWorkingDays, daysElapsed: totalWorkingDays, monthlyPotential: cumulativePotential, cumulativeMax, remainingToMax, capacityRemaining, contractOverload };
  };

  const metrics = getCumulativeMetrics();
  const dailyTarget = 8.0;
  const isLastMonth = dateRange?.label === 'Last Month';

  const iconBox = (Icon) => (
    <Box w="8" h="8" bg="rgba(120,197,245,0.08)" rounded="lg" border="1px solid rgba(120,197,245,0.15)" display="flex" alignItems="center" justifyContent="center">
      <Icon size={15} color="#78C5F5" />
    </Box>
  );

  const cardStyle = {
    bg: '#22252A',
    p: 8,
    rounded: '24px',
    border: '1px solid',
    borderColor: '#343840',
    _hover: { borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' },
    transition: 'all 0.2s',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
  };

  const labelStyle = { fontSize: 'sm', fontWeight: '600', color: '#8A9099' };
  const valueStyle = { fontSize: '2xl', fontWeight: '300', color: '#ECEEF0' };

  if (isMultiMonth) {
    return (
      <Box {...cardStyle}>
        <VStack gap={6} align="stretch">
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1}>
              <Text fontSize="xs" fontWeight="600" color="#565C66" letterSpacing="0.1em" textTransform="uppercase">Contract Context</Text>
              <Text fontSize="2xl" fontWeight="300" color="#ECEEF0" letterSpacing="-0.02em">{monthCount} Month{monthCount > 1 ? 's' : ''} Overview</Text>
            </VStack>
            <Box w="12" h="12" bg="rgba(120,197,245,0.08)" rounded="lg" border="1px solid rgba(120,197,245,0.15)" display="flex" alignItems="center" justifyContent="center">
              <Target size={22} color="#78C5F5" />
            </Box>
          </HStack>

          <VStack gap={0} align="stretch">
            {[
              { icon: Calendar, label: 'Total Working Days', value: metrics.workingDays },
              { icon: TrendingUp, label: 'Cumulative Potential', sub: `${metrics.workingDays} days × 8h`, value: `${metrics.monthlyPotential}h`, valueColor: '#2E9BD6' },
              { icon: Target, label: 'Cumulative Max', sub: `${monthCount} months × 180h`, value: `${metrics.cumulativeMax}h` },
              { icon: Target, label: 'To Cumulative Min', sub: `${monthCount} months × 160h`, value: totalHours >= (monthCount * 160) ? '✓ Reached' : `${Math.max((monthCount * 160) - totalHours, 0).toFixed(1)}h`, valueColor: totalHours >= (monthCount * 160) ? '#2E9BD6' : '#ECEEF0' },
              { icon: Clock, label: 'Remaining to Max', value: `${metrics.remainingToMax.toFixed(1)}h | ${metrics.capacityRemaining.toFixed(0)}%`, valueColor: '#2E9BD6' },
            ].map(({ icon: Icon, label, sub, value, valueColor }, i, arr) => (
              <Box key={label}>
                <HStack justify="space-between" align="center" py={3}>
                  <HStack gap={3}>
                    {iconBox(Icon)}
                    <VStack align="start" gap={0}>
                      <Text {...labelStyle}>{label}</Text>
                      {sub && <Text fontSize="xs" color="#565C66">{sub}</Text>}
                    </VStack>
                  </HStack>
                  <Text {...valueStyle} color={valueColor || '#ECEEF0'}>{value}</Text>
                </HStack>
                {i < arr.length - 1 && <Separator borderColor="#2A2E35" />}
              </Box>
            ))}
            {metrics.contractOverload > 0 && (
              <>
                <Separator borderColor="#2A2E35" />
                <HStack justify="space-between" align="center" py={3}>
                  <HStack gap={3}>
                    <Box w="8" h="8" bg="rgba(232,133,106,0.10)" rounded="lg" border="1px solid rgba(232,133,106,0.2)" display="flex" alignItems="center" justifyContent="center">
                      <TrendingUp size={15} color="#E8856A" />
                    </Box>
                    <Text {...labelStyle}>Total Contract Overload</Text>
                  </HStack>
                  <Text {...valueStyle} color="#E8856A">{metrics.contractOverload.toFixed(1)}h</Text>
                </HStack>
              </>
            )}
          </VStack>
        </VStack>
      </Box>
    );
  }

  return (
    <Box {...cardStyle}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" fontWeight="600" color="#565C66" letterSpacing="0.1em" textTransform="uppercase">Contract Context</Text>
            <Text fontSize="2xl" fontWeight="300" color="#ECEEF0" letterSpacing="-0.02em">Day {metrics.daysElapsed} of {metrics.workingDays}</Text>
          </VStack>
          <Box w="12" h="12" bg="rgba(120,197,245,0.08)" rounded="lg" border="1px solid rgba(120,197,245,0.15)" display="flex" alignItems="center" justifyContent="center">
            {isLastMonth ? <Target size={22} color="#78C5F5" /> : <Calendar size={22} color="#78C5F5" />}
          </Box>
        </HStack>

        <VStack gap={0} align="stretch">
          {[
            { icon: Target, label: 'Daily Target', value: `${dailyTarget.toFixed(1)}h` },
            { icon: Calendar, label: 'No. of working days', value: metrics.workingDays },
            { icon: TrendingUp, label: 'Monthly Potential', sub: `${metrics.workingDays} days × ${dailyTarget}h`, value: `${metrics.monthlyPotential}h`, valueColor: '#2E9BD6' },
            { icon: Target, label: 'To Min (160h)', value: totalHours >= 160 ? '✓ Reached' : `${Math.max(160 - totalHours, 0).toFixed(1)}h`, valueColor: totalHours >= 160 ? '#2E9BD6' : '#ECEEF0' },
            { icon: Clock, label: 'Remaining to Max', value: `${metrics.remainingToMax.toFixed(1)}h | ${metrics.capacityRemaining.toFixed(0)}%`, valueColor: '#2E9BD6' },
          ].map(({ icon: Icon, label, sub, value, valueColor }, i, arr) => (
            <Box key={label}>
              <HStack justify="space-between" align="center" py={3}>
                <HStack gap={3}>
                  {iconBox(Icon)}
                  <VStack align="start" gap={0}>
                    <Text {...labelStyle}>{label}</Text>
                    {sub && <Text fontSize="xs" color="#565C66">{sub}</Text>}
                  </VStack>
                </HStack>
                <Text {...valueStyle} color={valueColor || '#ECEEF0'}>{value}</Text>
              </HStack>
              {i < arr.length - 1 && <Separator borderColor="#2A2E35" />}
            </Box>
          ))}
          {nextMonthRollover > 0 && (
            <>
              <Separator borderColor="#2A2E35" />
              <HStack justify="space-between" align="center" py={3}>
                <HStack gap={3}>
                  <Box w="8" h="8" bg="rgba(232,133,106,0.10)" rounded="lg" border="1px solid rgba(232,133,106,0.2)" display="flex" alignItems="center" justifyContent="center">
                    <TrendingUp size={15} color="#E8856A" />
                  </Box>
                  <Text {...labelStyle}>Next Month Rollover</Text>
                </HStack>
                <Text {...valueStyle} color="#E8856A">{nextMonthRollover.toFixed(1)}h</Text>
              </HStack>
            </>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default ContractContext;
