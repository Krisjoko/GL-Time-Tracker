import { useState, useEffect, useCallback } from 'react';
import { Box, VStack, HStack, Table, Badge, Text, Button, Link } from '@chakra-ui/react';
import { CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { storage } from '@api/monday-storage';
import BoardSDK from '@api/BoardSDK.js';

const board = new BoardSDK();

const WeeklySummaryTable = ({ items = [], dateRange, onRefresh, totalHours = 0, rolloverHours = 0 }) => {
  const [weekApprovals, setWeekApprovals] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [xeroSubmitted, setXeroSubmitted] = useState(false);

  const isLastFridayOfMonth = () => {
    const today = new Date();
    if (today.getDay() !== 5) return false;
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const currentDay = today.getDate();
    return (lastDay - currentDay) < 7;
  };

  const loadApprovals = useCallback(async (showSyncSpinner = false) => {
    if (!dateRange?.from) return;
    if (showSyncSpinner) setSyncing(true);
    const monthKey = `week_approvals_${dateRange.from.getFullYear()}_${dateRange.from.getMonth()}`;
    const xeroKey = `xero_submitted_${dateRange.from.getFullYear()}_${dateRange.from.getMonth()}`;
    try {
      const { value } = await storage().key(monthKey).get();
      const loaded = value || {};

      // One-time migration: fix miskeyed week_2026-03-01 → week_2026-03-02
      if (loaded['week_2026-03-01'] && !loaded['week_2026-03-02']) {
        const fixed = { ...loaded, 'week_2026-03-02': loaded['week_2026-03-01'] };
        await storage().key(monthKey).set(fixed);
        setWeekApprovals(fixed);
      } else {
        setWeekApprovals(loaded);
      }

      const { value: xeroStatus } = await storage().key(xeroKey).get();
      setXeroSubmitted(xeroStatus || false);
    } catch (err) {
      console.error('Failed to load week approvals:', err);
      setWeekApprovals({});
      setXeroSubmitted(false);
    } finally {
      setLoading(false);
      if (showSyncSpinner) setSyncing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (dateRange?.from) {
      loadApprovals();
    }
  }, [dateRange, loadApprovals]);

  const getWeeklyBreakdown = () => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const weeks = [];
    const year = dateRange.from.getFullYear();
    const month = dateRange.from.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let weekNum = 1;
    let currentDay = 1;

    while (currentDay <= lastDay) {
      const weekStart = new Date(year, month, currentDay);
      const dow = weekStart.getDay();
      let daysInWeek;
      if (weekNum === 1) {
        daysInWeek = dow === 0 ? 1 : (7 - dow);
      } else {
        daysInWeek = 7;
      }
      daysInWeek = Math.min(daysInWeek, lastDay - currentDay + 1);
      const weekEnd = new Date(year, month, currentDay + daysInWeek - 1);

      const weekHours = items.reduce((sum, item) => {
        const d = new Date(item.date);
        return (d >= weekStart && d <= weekEnd)
          ? sum + (item.timeTracking?.durationInSeconds || 0) / 3600
          : sum;
      }, 0);

      // Skip ghost weeks (1 day, 0 hours, start of month)
      if (!(daysInWeek === 1 && weekHours === 0 && currentDay === 1)) {
        const weekKeyDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
        const weekKey = `week_${weekKeyDate}`;
        const approvalData = weekApprovals[weekKey];
        weeks.push({
          weekNum,
          weekKey,
          start: weekStart,
          end: weekEnd,
          hours: weekHours,
          approved: approvalData?.approved || false,
          by: approvalData?.by,
          userId: approvalData?.userId,
          at: approvalData?.at
        });
      }
      currentDay += daysInWeek;
      weekNum++;
    }
    return weeks.map((w, i) => ({ ...w, weekNum: i + 1 }));
  };

  const weeks = getWeeklyBreakdown();
  const allWeeksApproved = weeks.length > 0 && weeks.every(w => w.approved);
  const rawTotal = totalHours + rolloverHours;
  const totalBillable = Math.min(rawTotal, 180);
  const overageToNextMonth = Math.max(rawTotal - 180, 0);

  const handleWeekApprove = async (weekNum, weekKey) => {
    try {
      const existingApproval = weekApprovals[weekKey];
      if (existingApproval?.approved) {
        alert(`This week was already approved by ${existingApproval.by} on ${existingApproval.at}. Locked.`);
        return;
      }

      let userName = 'Nadia';
      let userId = null;
      try {
        const currentUser = await board.users.me().execute();
        userName = currentUser.name;
        userId = currentUser.id;
      } catch (userErr) {
        console.warn('Could not fetch current user (guest restriction). Using fallback identity.');
      }

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${dd}|${mm}|${yyyy} @${hh}:${min}`;

      const monthKey = `week_approvals_${dateRange.from.getFullYear()}_${dateRange.from.getMonth()}`;
      const newApprovals = {
        ...weekApprovals,
        [weekKey]: { approved: true, by: userName, userId, at: timestamp }
      };
      await storage().key(monthKey).set(newApprovals);
      setWeekApprovals(newApprovals);
      await loadApprovals();

      alert(`✅ Week ${weekNum} approved by ${userName} on ${timestamp}\n\nThis approval is now locked.`);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save week approval:', err);
      alert('Failed to save approval. Please try again.');
    }
  };

  const handleXeroSubmit = async () => {
    if (submitting || xeroSubmitted) return;
    setSubmitting(true);
    const monthLabel = dateRange?.from
      ? dateRange.from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Current Month';
    try {
      const lineItemsMap = new Map();
      items.forEach(item => {
        if (!item.date) return;
        const dateObj = new Date(item.date);
        const isoDate = dateObj.toISOString().split('T')[0];
        const displayDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const hours = (item.timeTracking?.durationInSeconds || 0) / 3600;
        if (hours <= 0) return;
        if (!lineItemsMap.has(isoDate)) {
          lineItemsMap.set(isoDate, { date: isoDate, hours: 0, description: `Professional Services - ${displayDate}` });
        }
        lineItemsMap.get(isoDate).hours += hours;
      });

      const lineItems = Array.from(lineItemsMap.values())
        .map(item => ({ date: item.date, hours: parseFloat(item.hours.toFixed(2)), description: item.description }))
        .filter(item => item.hours > 0);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('https://gltv-xero-server.onrender.com/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          totalHours: parseFloat(totalBillable.toFixed(2)),
          monthLabel,
          lineItems
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData = null;
        try { errorData = await response.json(); } catch { /* ignore */ }
        const errorMsg = errorData?.error || 'Unknown server error';
        alert(`❌ Server error (${response.status}): ${errorMsg}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        const xeroKey = `xero_submitted_${dateRange.from.getFullYear()}_${dateRange.from.getMonth()}`;
        await storage().key(xeroKey).set(true);
        setXeroSubmitted(true);

        for (const item of items) {
          const postMessage = overageToNextMonth > 0
            ? `Final month-end approval completed. Total billable: ${totalBillable.toFixed(1)}h (${rawTotal.toFixed(1)}h logged, capped at 180h, ${overageToNextMonth.toFixed(1)}h rolling to next month). Xero invoice: ${result.invoiceNumber || 'pending'}`
            : `Final month-end approval completed. Total billable: ${totalBillable.toFixed(1)}h. Xero invoice: ${result.invoiceNumber || 'pending'}`;
          await board.item(item.id).post().create(postMessage).execute();
        }

        await loadApprovals();

        const alertMessage = overageToNextMonth > 0
          ? `✅ Draft invoice created in Xero — ${result.invoiceNumber || 'N/A'} for ${totalBillable.toFixed(1)}h (${rawTotal.toFixed(1)}h logged, capped at 180h). ${overageToNextMonth.toFixed(1)}h will roll to next month. Review and send from your Xero drafts.`
          : `✅ Draft invoice created in Xero — ${result.invoiceNumber || 'N/A'} for ${totalBillable.toFixed(1)}h. Review and send from your Xero drafts.`;
        alert(alertMessage);
        onRefresh?.();
      } else {
        alert(`❌ Could not create invoice: ${result.error || 'Unknown error'}.`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('❌ Request timed out after 60 seconds. The Xero server may be starting up. Please wait a moment and try again.');
      } else if (err.message?.includes('fetch')) {
        alert('❌ Cannot reach Xero server. The server may be waking from sleep (first request can take 30-60 seconds). Please wait and try again.');
      } else {
        alert(`❌ Network error: ${err.message}. Please check your connection and try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || weeks.length === 0) return null;

  return (
    <Box bg="#22252A" p={6} rounded="lg" border="1px solid" borderColor="#343840" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <VStack gap={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" fontWeight="600" color="#ECEEF0" textTransform="uppercase" letterSpacing="0.1em">
            Weekly Approval Summary
          </Text>
          <Button
            size="xs"
            bg="transparent"
            color="#565C66"
            border="1px solid"
            borderColor="#343840"
            rounded="md"
            fontWeight="600"
            _hover={{ bg: '#2A2E35', color: '#ECEEF0', borderColor: '#2E9BD6' }}
            transition="all 0.2s"
            onClick={() => loadApprovals(true)}
            disabled={syncing}
            title="Sync approvals from storage"
          >
            <RefreshCw size={12} style={syncing ? { animation: 'spin 0.8s linear infinite' } : {}} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </HStack>

        <Table.Root size="sm" style={{ background: 'transparent', borderCollapse: 'separate', borderSpacing: 0 }}>
          <Table.Header style={{ background: 'transparent' }}>
            <Table.Row style={{ background: '#1E2126' }} borderColor="#2E3138">
              <Table.ColumnHeader fontWeight="600" color="#565C66" fontSize="xs" textTransform="uppercase">Period</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="600" color="#565C66" fontSize="xs" textTransform="uppercase">Dates</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" fontWeight="600" color="#565C66" fontSize="xs" textTransform="uppercase">Hours</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="600" color="#565C66" fontSize="xs" textTransform="uppercase">Status</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end" fontWeight="600" color="#565C66" fontSize="xs" textTransform="uppercase">Action</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body style={{ background: 'transparent' }}>
            {weeks.map((week) => (
              <Table.Row key={week.weekNum} style={{ background: '#22252A' }} _hover={{ bg: '#2A2E35' }} borderColor="#2E3138">
                <Table.Cell fontWeight="600" color="#ECEEF0">Week {week.weekNum}</Table.Cell>
                <Table.Cell fontSize="sm" color="#8A9099">
                  {week.start.getDate()} {week.start.toLocaleDateString('en-US', { month: 'short' })} – {week.end.getDate()} {week.end.toLocaleDateString('en-US', { month: 'short' })}
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight="700" color="#ECEEF0">{week.hours.toFixed(1)}h</Table.Cell>
                <Table.Cell>
                  {week.approved ? (
                    <Box bg="rgba(120,197,245,0.08)" border="1px solid" borderColor="rgba(46,155,214,0.3)" rounded="lg" px={3} py={2} display="inline-flex" alignItems="flex-start" gap={2} maxW="220px">
                      <CheckCircle size={16} color="#2E9BD6" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <VStack align="start" gap={0.5} minW={0}>
                        <Text fontSize="xs" fontWeight="700" color="#2E9BD6" lineHeight="1.2">Approved</Text>
                        {week.by && (
                          <Text fontSize="xs" color="#8A9099" lineHeight="1.2">
                            by{' '}
                            {week.userId ? (
                              <Link href={`https://goallounge.monday.com/users/${week.userId}`} target="_blank" rel="noopener noreferrer" color="#2E9BD6" fontWeight="600" _hover={{ color: '#78C5F5' }}>
                                {week.by}
                              </Link>
                            ) : week.by}
                          </Text>
                        )}
                        {week.at && <Text fontSize="xs" color="#565C66" lineHeight="1.2">{week.at}</Text>}
                      </VStack>
                    </Box>
                  ) : (
                    <Badge bg="rgba(245,240,144,0.1)" color="#D4C840" border="1px solid rgba(212,200,64,0.3)" px={3} py={1.5} rounded="full" fontSize="xs" fontWeight="600">
                      <HStack gap={1.5}><Clock size={12} /><Text>Pending</Text></HStack>
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell textAlign="end">
                  {!week.approved && (
                    <Button
                      size="sm"
                      bg="#2E9BD6"
                      color="white"
                      border="none"
                      rounded="lg"
                      fontWeight="700"
                      _hover={{ bg: '#1A6FA8' }}
                      transition="all 0.2s"
                      onClick={() => handleWeekApprove(week.weekNum, week.weekKey)}
                    >
                      Approve W{week.weekNum}
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}

            {/* Final month row */}
            <Table.Row style={{ background: '#1A1C20' }} borderTop="1px solid" borderColor="#343840">
              <Table.Cell colSpan={2} fontWeight="700" fontSize="md" color="#ECEEF0">Final Month</Table.Cell>
              <Table.Cell textAlign="end">
                {overageToNextMonth > 0 ? (
                  <VStack align="end" gap={1}>
                    <Text fontSize="sm" color="#565C66" fontWeight="500">{rawTotal.toFixed(1)}h logged</Text>
                    <HStack gap={2} align="baseline">
                      <Text fontSize="xs" color="#8A9099" fontWeight="600">Billed:</Text>
                      <Text fontSize="xl" color="#ECEEF0" fontWeight="800">{totalBillable.toFixed(1)}h</Text>
                    </HStack>
                  </VStack>
                ) : (
                  <Text fontSize="xl" color="#ECEEF0" fontWeight="800">{totalBillable.toFixed(1)}h</Text>
                )}
              </Table.Cell>
              <Table.Cell>
                <HStack gap={3}>
                  {allWeeksApproved ? (
                    <Badge bg="rgba(120,197,245,0.1)" color="#2E9BD6" border="1px solid rgba(46,155,214,0.3)" fontSize="xs" fontWeight="600" px={3} py={1.5} rounded="full">
                      <HStack gap={1}><CheckCircle size={11} /><Text>Complete</Text></HStack>
                    </Badge>
                  ) : (
                    <Badge bg="rgba(240,160,160,0.1)" color="#E04040" border="1px solid rgba(224,64,64,0.3)" fontSize="xs" fontWeight="600" px={3} py={1.5} rounded="full">
                      Incomplete
                    </Badge>
                  )}

                  {allWeeksApproved && !xeroSubmitted && (
                    <button
                      onClick={handleXeroSubmit}
                      disabled={submitting}
                      style={{
                        background: submitting ? '#1A6FA8' : '#2E9BD6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 14px',
                        fontSize: '12px',
                        fontFamily: 'Helvetica Neue, sans-serif',
                        fontWeight: '600',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {submitting ? (
                        <>
                          <span style={{
                            width: '10px', height: '10px', border: '2px solid #ffffff',
                            borderTopColor: 'transparent', borderRadius: '50%',
                            display: 'inline-block', animation: 'spin 0.8s linear infinite'
                          }} />
                          Submitting...
                        </>
                      ) : 'Submit to Xero →'}
                    </button>
                  )}

                  {allWeeksApproved && xeroSubmitted && (
                    <Badge bg="rgba(46,214,100,0.15)" color="#4CD47A" border="1px solid rgba(46,214,100,0.3)" fontSize="xs" fontWeight="600" px={3} py={1.5} rounded="full">
                      ✅ Submitted
                    </Badge>
                  )}
                </HStack>
              </Table.Cell>
              <Table.Cell />
            </Table.Row>
          </Table.Body>
        </Table.Root>

        <VStack gap={1} align="end">
          {rolloverHours > 0 && (
            <Text fontSize="xs" color="#565C66">Includes {rolloverHours.toFixed(1)}h rollover from previous month</Text>
          )}
          {overageToNextMonth > 0 && (
            <Text fontSize="xs" color="#D4C840" fontWeight="600">
              {overageToNextMonth.toFixed(1)}h carried to next month · Billed at 180h cap
            </Text>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default WeeklySummaryTable;
