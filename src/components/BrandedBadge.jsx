import { useState } from 'react';
import { Box, HStack, Text, Image } from '@chakra-ui/react';

const BrandedBadge = ({ name = "Claudio | GLTV Dashboard — X, Bigly" }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Box
      bg="#22252A"
      px={5}
      py={3}
      rounded="lg"
      border="1px solid"
      borderColor="#343840"
      display="inline-block"
    >
      <HStack gap={3}>
        <Box
          w="26px"
          h="26px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          {!imgError ? (
            <Image
              src="/assets/GLTV-Logomark-Black_4x.png"
              alt="GLTV"
              w="26px"
              h="26px"
              style={{ filter: 'invert(1)' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <Box bg="#2E9BD6" color="white" fontWeight="800" fontSize="sm" rounded="6px" px="6px" py="4px">
              GL
            </Box>
          )}
        </Box>
        <Box w="1px" h="20px" bg="#343840" />
        <HStack gap={0}>
          <Text
            fontSize="md"
            fontWeight="700"
            color="#ECEEF0"
            fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          >
            Claudio | GLTV Dashboard
          </Text>
          <Text
            fontSize="md"
            fontWeight="700"
            color="#ECEEF0"
            fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          >
            {" — "}
          </Text>
          <Text
            fontSize="sm"
            fontWeight="500"
            color="#8A9099"
            fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          >
            X, Bigly
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
};

export default BrandedBadge;
