import { useEffect, useState } from 'react';
import { Box, Container, VStack, HStack, Text, Button, Grid, Spinner, Center, Alert } from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import BoardSDK from '@api/BoardSDK.js';
import CapacityBarometer from './components/CapacityBarometer';
import HoursTable from './components/HoursTable';
import DateFilter from './components/DateFilter';
import ContractContext from './components/ContractContext';
import BrandedBadge from './components/BrandedBadge';
import BillingBreakdown from './components/BillingBreakdown';
import WeeklySummaryTable from './components/WeeklySummaryTable';

const board = new BoardSDK();

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalHours, setTotalHours] = useState(0);
  const [nextMonthRollover, setNextMonthRollover] = useState(0);
  const [rolloverHours, setRolloverHours] = useState(0);
  const [rolloverMonth, setRolloverMonth] = useState('');

  // Suppress SDK errors for guest users (time tracking restrictions)
  useEffect(() => {
    const suppressSDKErrors = (event) => {
      if (
        event.message?.includes('reportTime') ||
        (event.message?.includes('Command') && event.message?.includes('not supported'))
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        console.debug('Suppressed guest user SDK restriction (reportTime command)');
        return true;
      }
    };
    window.addEventListener('error', suppressSDKErrors, true);
    return () => window.removeEventListener('error', suppressSDKErrors, true);
  }, []);

  const getThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return {
      from: new Date(year, month, 1),
      to: new Date(year, month + 1, 0),
      label: 'This Month'
    };
  };

  const [dateRange, setDateRange] = useState(getThisMonth());

  const getMonthCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 1;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
    return Math.max(1, months);
  };

  const monthCount = getMonthCount();

  const isLastFridayOfMonth = () => {
    const today = new Date();
    if (today.getDay() !== 5) return false;
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    return (lastDayOfMonth - currentDay) < 7;
  };

  const [isLastFriday, setIsLastFriday] = useState(isLastFridayOfMonth());

  const  fetchData:
javascript
const toLocalDateStr = (d) => 
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
      let query = board.items()
        .withColumns(['date', 'hourStarted', 'timeTracking'])
        .withSubItems(['status']);

      if (dateRange?.from && dateRange?.to) {
       const fromStr = toLocalDateStr(dateRange.from);
const toStr = toLocalDateStr(dateRange.to);
        query = query.where({ date: { between: { from: fromStr, to: toStr } } });
      }

      let results;
      try {
        results = await query.execute();
      } catch (sdkError) {
        // Guest users can't access timeTracking column — fetch without it
        if (
          sdkError.message?.includes('reportTime') ||
          sdkError.message?.includes('not supported')
        ) {
          console.warn('Time tracking not available (guest user restriction). Fetching basic data only.');
          let fallbackQuery = board.items()
            .withColumns(['date', 'hourStarted'])
            .withSubItems(['status']);

          if (dateRange?.from && dateRange?.to) {
      const fromStr = toLocalDateStr(dateRange.from);
const toStr = toLocalDateStr(dateRange.to);
            fallbackQuery = fallbackQuery.where({ date: { between: { from: fromStr, to: toStr } } });
          }

          results = await fallbackQuery.execute();
          results.items = (results.items || []).map(item => ({
            ...item,
            timeTracking: { durationInSeconds: 0, isRunning: false, startedAt: null }
          }));
        } else {
          throw sdkError;
        }
      }

      setIsLastFriday(isLastFridayOfMonth());

      const fetchedItems = results.items || [];
      setItems(fetchedItems);

      const calculatedHours = fetchedItems.reduce((sum, item) => {
        const durationInHours = (item.timeTracking?.durationInSeconds || 0) / 3600;
        return sum + durationInHours;
      }, 0);
      setTotalHours(calculatedHours);

      const rollover = Math.max(calculatedHours - 180, 0);
      setNextMonthRollover(rollover);

      if (monthCount === 1) {
        const currentYear = dateRange.from.getFullYear();
        const currentMonth = dateRange.from.getMonth();

        // March 2026 — no rollover to check from Feb 2026
        if (currentYear === 2026 && currentMonth === 2) {
          setRolloverHours(0);
          setRolloverMonth('');
        } else {
          const prevMonthFrom = new Date(dateRange.from);
          prevMonthFrom.setMonth(prevMonthFrom.getMonth() - 1);
          const prevMonthTo = new Date(dateRange.from);
          prevMonthTo.setDate(0);

          try {
            const prevResults = await board.items()
              .withColumns(['timeTracking'])
              .where({
                date: {
                  between: {
                   from: toLocalDateStr(prevMonthFrom),
to: toLocalDateStr(prevMonthTo)

                  }
                }
              })
              .execute();

            const prevMonthHours = (prevResults.items || []).reduce((sum, item) => {
              return sum + ((item.timeTracking?.durationInSeconds || 0) / 3600);
            }, 0);
            const prevOverage = Math.max(prevMonthHours - 180, 0);
            setRolloverHours(prevOverage);
            setRolloverMonth(prevMonthTo.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
          } catch (err) {
            console.error('Failed to fetch previous month data:', err);
            setRolloverHours(0);
            setRolloverMonth('');
          }
        }
      } else {
        setRolloverHours(0);
        setRolloverMonth('');
      }
    } catch (err) {
      console.error('Failed to fetch hours:', err);
      setError(err.message || 'Failed to load hours data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleExport = () => {
    if (items.length === 0) return;
    const csvData = [
      ['Date', 'Task', 'Start Time (UK)', 'Duration (hours)'],
      ...items.map(item => [
        item.date?.toLocaleDateString('en-GB') || '',
        item.name || '',
        item.hourStarted
          ? `${String(item.hourStarted.hour).padStart(2, '0')}:${String(item.hourStarted.minute).padStart(2, '0')}`
          : '',
        item.timeTracking ? (item.timeTracking.durationInSeconds / 3600).toFixed(2) : ''
      ])
    ];
    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
link.setAttribute('download', `hours-export-${toLocalDateStr(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box bg="#1A1C20" minH="100vh" py={8} fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
      <Container maxW="6xl">
        <VStack gap={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="start">
            <BrandedBadge name="Claudio | GLTV Dashboard" />
            <Button
              size="sm"
              bg="transparent"
              color="#ECEEF0"
              border="1px solid"
              borderColor="#343840"
              rounded="lg"
              fontWeight="600"
              _hover={{ bg: '#2A2E35', borderColor: '#2E9BD6' }}
              transition="all 0.2s"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </HStack>

          {/* Date filter */}
          <DateFilter value={dateRange} onChange={setDateRange} />

          {/* Error banner */}
          {error && (
            <Alert.Root colorPalette="red" rounded="xl">
              <Alert.Indicator />
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          {/* Loading / content */}
          {loading ? (
            <Center p={8}>
              <Spinner size="lg" color="#2E9BD6" />
            </Center>
          ) : (
            <>
              <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
                <ContractContext
                  totalHours={totalHours}
                  dateRange={dateRange}
                  nextMonthRollover={nextMonthRollover}
                  monthCount={monthCount}
                />
                <CapacityBarometer totalHours={totalHours} monthCount={monthCount} />
              </Grid>

              <BillingBreakdown
                totalHours={totalHours}
                rolloverHours={rolloverHours}
                rolloverMonth={rolloverMonth}
                monthCount={monthCount}
              />

              {monthCount === 1 && (
                <WeeklySummaryTable
                  items={items}
                  dateRange={dateRange}
                  onRefresh={fetchData}
                  totalHours={totalHours}
                  rolloverHours={rolloverHours}
                />
              )}
            </>
          )}

          <HoursTable
            items={items}
            loading={loading}
            error={error}
            onExport={handleExport}
          />

          {/* Footer */}
          <Box
            bg="#22252A"
            px={6}
            py={3}
            rounded="lg"
            border="1px solid"
            borderColor="#343840"
            alignSelf="flex-end"
          >
            <Text fontSize="sm" fontWeight="600" color="#8A9099" letterSpacing="0.05em" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
              ©GOALLOUNGE.TV - All Rights Reserved
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
