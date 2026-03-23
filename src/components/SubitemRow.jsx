import { useState } from 'react';
import { Box, HStack, Text, Badge, IconButton } from '@chakra-ui/react';
import { CheckCircle, Circle } from 'lucide-react';
import BoardSDK from '@api/BoardSDK.js';

const board = new BoardSDK();

/**
 * SubitemRow — displays a single subitem with an approval toggle.
 */
const SubitemRow = ({ subitem, parentItem, onApprovalToggle }) => {
  const [updating, setUpdating] = useState(false);

  const isApproved = subitem.status === 'Done';

  const handleApprovalToggle = async () => {
    setUpdating(true);
    try {
      const newStatus = isApproved ? 'Working on it' : 'Done';
      await board
        .item(parentItem.id)
        .subitem(subitem.id)
        .update({ status: newStatus })
        .returnColumns(['status'])
        .execute();
      onApprovalToggle?.();
    } catch (err) {
      console.error('Failed to update subitem status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <HStack
      pl={12}
      pr={4}
      py={3}
      bg={isApproved ? '#1A2820' : '#22252A'}
      borderLeft="3px solid"
      borderLeftColor={isApproved ? '#02A049' : '#343840'}
      _hover={{ bg: isApproved ? '#1E2E24' : '#2A2E35' }}
      transition="all 0.2s"
      gap={4}
    >
      <IconButton
        size="sm"
        variant="ghost"
        onClick={handleApprovalToggle}
        disabled={updating}
        aria-label={isApproved ? 'Mark as unapproved' : 'Approve task'}
        color={isApproved ? '#02A049' : '#565C66'}
        _hover={{ transform: 'scale(1.1)' }}
      >
        {isApproved ? <CheckCircle size={20} /> : <Circle size={20} />}
      </IconButton>
      <Text flex={1} fontSize="sm" color="#ECEEF0" fontWeight={isApproved ? '600' : '400'}>
        {subitem.name}
      </Text>
      {subitem.date && (
        <Text fontSize="xs" color="#8A9099">
          {new Date(subitem.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
      )}
      <Badge
        bg={isApproved ? 'rgba(2,160,73,0.15)' : 'rgba(255,165,0,0.12)'}
        color={isApproved ? '#02A049' : '#FFA500'}
        border={`1px solid ${isApproved ? 'rgba(2,160,73,0.3)' : 'rgba(255,165,0,0.3)'}`}
        fontSize="xs"
        px={2}
        py={0.5}
        rounded="full"
        fontWeight="600"
      >
        {isApproved ? 'Approved' : 'Pending'}
      </Badge>
    </HStack>
  );
};

export default SubitemRow;
