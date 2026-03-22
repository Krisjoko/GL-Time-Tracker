import { useState, Fragment } from 'react';
import { Box, VStack, HStack, Text, Button, Input, Table, Center, Spinner, Alert, Badge } from '@chakra-ui/react';
import { Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { formatTime, formatDuration } from '@api/column-formatters';

const HoursTable = ({ items = [], loading = false, error = null, onExport = () => {} }) => {
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (itemId) => setExpandedRows(prev => ({ ...prev, [itemId]: !prev[itemId] }));

  const getStatusColor = (status) => {
    const statusMap = {
      'Done': { bg: 'rgba(0, 200, 117, 0.12)', color: '#00c875', border: 'rgba(0, 200, 117, 0.2)', label: 'Logged' },
      'Working on it': { bg: 'rgba(253, 171, 61, 0.12)', color: '#fdab3d', border: 'rgba(253, 171, 61, 0.2)', label: 'Working on it' },
      'Stuck': { bg: 'rgba(223, 47, 74, 0.12)', color: '#df2f4a', border: 'rgba(223, 47, 74, 0.2)', label: 'Stuck' },
      'Not started yet': { bg: 'rgba(85, 89, 223, 0.12)', color: '#5559df', border: 'rgba(85, 89, 223, 0.2)', label: 'Not started yet' },
    };
    return statusMap[status] || { bg: 'rgba(134, 142, 153, 0.12)', color: '#8A9099', border: 'rgba(134, 142, 153, 0.2)', label: status || 'Unknown' };
  };

  const filtered = items.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.date?.toLocaleDateString().includes(search)
  );

  if (error) {
    return (
      <Alert.Root colorPalette="red" rounded="lg" border="1px solid" borderColor="border.error">
        <Alert.Indicator />
        <Alert.Title>Error Loading Hours</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Root>
    );
  }

  return (
    <VStack gap={4} align="stretch" position="relative" fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif">
      <Box bg="#2E9BD6" px={5} py={2.5} rounded="lg" alignSelf="flex-start" position="relative" top="-8px" zIndex="2">
        <Text fontSize="sm" fontWeight="900" color="white" textTransform="uppercase" letterSpacing="0.08em">HOURS LOG</Text>
      </Box>

      <HStack justify="space-between" align="center" mt="-4" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" fontWeight="600" color="#8A9099">{items.length} total entries</Text>
        <Button
          size="sm"
          bg="transparent"
          color="#8A9099"
          border="1px solid"
          borderColor="#343840"
          rounded="lg"
          fontWeight="600"
          _hover={{ bg: '#2A2E35', borderColor: '#2E9BD6' }}
          transition="all 0.2s"
          onClick={onExport}
          disabled={loading || items.length === 0}
        >
          <Download size={15} />
          Export
        </Button>
      </HStack>

      <Box position="relative">
        <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="#565C66" zIndex="1">
          <Search size={15} />
        </Box>
        <Input
          placeholder="Search by task name or date..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          pl="10"
          bg="#22252A"
          border="1px solid"
          borderColor="#343840"
          color="#ECEEF0"
          rounded="lg"
          _placeholder={{ color: '#565C66' }}
          _focus={{ borderColor: '#2E9BD6', boxShadow: '0 0 0 3px rgba(46,155,214,0.12)' }}
        />
      </Box>

      <Box bg="#22252A" rounded="lg" border="1px solid" borderColor="#343840" overflow="hidden">
        {loading ? (
          <Center p={8}><Spinner size="lg" color="#2E9BD6" /></Center>
        ) : filtered.length === 0 ? (
          <Center p={8}>
            <Text color="#8A9099" fontWeight="500">
              {items.length === 0 ? 'No hours logged yet' : 'No matching records'}
            </Text>
          </Center>
        ) : (
          <Table.Root size="sm" style={{ background: 'transparent', borderCollapse: 'separate', borderSpacing: 0 }}>
            <Table.Header style={{ background: 'transparent' }}>
              <Table.Row style={{ background: '#1E2126' }} borderColor="#2E3138">
                {['Date', 'Task', 'Start Time (UK)', 'Duration'].map(h => (
                  <Table.ColumnHeader
                    key={h}
                    fontWeight="600"
                    color="#565C66"
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                    textAlign={h === 'Duration' ? 'end' : 'start'}
                  >
                    {h}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body style={{ background: 'transparent' }}>
              {filtered.map(item => {
                const hasSubitems = item.subitems && item.subitems.length > 0;
                const isExpanded = expandedRows[item.id];
                return (
                  <Fragment key={item.id}>
                    <Table.Row
                      style={{ background: '#22252A' }}
                      _hover={{ bg: '#2A2E35' }}
                      borderColor="#2E3138"
                      color="#ECEEF0"
                      cursor={hasSubitems ? 'pointer' : 'default'}
                      onClick={() => hasSubitems && toggleRow(item.id)}
                    >
                      <Table.Cell color="#ECEEF0" fontWeight="500">
                        <HStack gap={2}>
                          {hasSubitems && (isExpanded ? <ChevronDown size={14} color="#8A9099" /> : <ChevronRight size={14} color="#8A9099" />)}
                          <Text>{item.date?.toLocaleDateString('en-GB', { weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit' })}</Text>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell color="#ECEEF0" fontSize="sm">
                        {item.name || <Text color="#565C66">—</Text>}
                        {hasSubitems && (
                          <Badge ml={2} fontSize="xs" bg="rgba(120,197,245,0.12)" color="#2E9BD6" border="1px solid rgba(46,155,214,0.2)">
                            {item.subitems.length} tasks
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell color="#8A9099" fontSize="sm">
                        {item.hourStarted ? formatTime(item.hourStarted.hour, item.hourStarted.minute) : 'N/A'}
                      </Table.Cell>
                      <Table.Cell textAlign="end" color="#ECEEF0" fontWeight="600">
                        {item.timeTracking ? formatDuration(item.timeTracking.durationInSeconds) : 'N/A'}
                      </Table.Cell>
                    </Table.Row>

                    {hasSubitems && isExpanded && (
                      <Table.Row style={{ background: '#22252A' }} borderColor="#2E3138">
                        <Table.Cell colSpan={4} p={0} style={{ background: '#1A1C20' }}>
                          <Box p={4}>
                            <Text fontSize="xs" fontWeight="600" color="#565C66" mb={2} textTransform="uppercase" letterSpacing="0.08em">
                              Execution Details
                            </Text>
                            <VStack align="stretch" gap={2}>
                              {item.subitems.map(subitem => {
                                const statusColors = getStatusColor(subitem.status);
                                return (
                                  <HStack key={subitem.id} justify="space-between" p={2.5} bg="#22252A" rounded="lg" border="1px solid #343840">
                                    <HStack gap={3}>
                                      <Box w="3px" h="20px" bg={statusColors.color} rounded="full" />
                                      <VStack align="start" gap={0}>
                                        <Text fontSize="sm" fontWeight="500" color="#ECEEF0">{subitem.name}</Text>
                                        {subitem.date && (
                                          <Text fontSize="xs" color="#8A9099">
                                            {new Date(subitem.date).toLocaleDateString('en-GB')}
                                          </Text>
                                        )}
                                      </VStack>
                                    </HStack>
                                    <Badge
                                      bg={statusColors.bg}
                                      color={statusColors.color}
                                      border={`1px solid ${statusColors.border}`}
                                      fontSize="xs"
                                      fontWeight="600"
                                    >
                                      {statusColors.label}
                                    </Badge>
                                  </HStack>
                                );
                              })}
                            </VStack>
                          </Box>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Fragment>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      <Text fontSize="xs" color="#565C66" textAlign="center">
        Showing {filtered.length} of {items.length} entries
      </Text>
    </VStack>
  );
};

export default HoursTable;
