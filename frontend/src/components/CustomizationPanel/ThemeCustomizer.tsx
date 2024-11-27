import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Stack,
  Text,
  Input,
  Button,
  useToast,
  Select,
  Image,
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useColorMode,
} from '@chakra-ui/react';
import { FiUpload, FiTrash2 } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl: string;
}

interface ThemeCustomizerProps {
  onThemeChange: (theme: Theme) => void;
  initialTheme?: Theme;
}

const defaultTheme: Theme = {
  primaryColor: '#3182CE',
  secondaryColor: '#63B3ED',
  backgroundColor: '#FFFFFF',
  textColor: '#1A202C',
  fontFamily: 'Inter, sans-serif',
  logoUrl: '',
};

const fontOptions = [
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Poppins, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
];

const ColorPickerField: React.FC<{ color: string; onChange: (color: string) => void; label: string }> = ({ color, onChange, label }) => {
  return (
    <Stack spacing={2}>
      <Text fontWeight="medium">{label}</Text>
      <Popover placement="right">
        <PopoverTrigger>
          <Button
            h="40px"
            w="100%"
            bg={color}
            _hover={{ bg: color }}
            border="1px solid"
            borderColor="gray.200"
          />
        </PopoverTrigger>
        <PopoverContent w="200px">
          <PopoverBody p={2}>
            <HexColorPicker color={color} onChange={onChange} />
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Stack>
  );
};

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  onThemeChange,
  initialTheme = defaultTheme,
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const toast = useToast();

  useEffect(() => {
    // Load fonts
    const fonts = [
      'Inter',
      'Roboto',
      'Poppins',
      'Open Sans',
      'Lato',
    ];

    fonts.forEach(font => {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    });
  }, []);

  const handleColorChange = (color: string, type: keyof Theme) => {
    const newTheme = { ...theme, [type]: color };
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  const handleFontChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = { ...theme, fontFamily: event.target.value };
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const newTheme = { ...theme, logoUrl: reader.result as string };
      setTheme(newTheme);
      onThemeChange(newTheme);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    const newTheme = { ...theme, logoUrl: '' };
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <VStack spacing={6} w="100%" p={4}>
      <ColorPickerField
        label="Primary Color"
        color={theme.primaryColor}
        onChange={(color) => handleColorChange(color, 'primaryColor')}
      />

      <ColorPickerField
        label="Secondary Color"
        color={theme.secondaryColor}
        onChange={(color) => handleColorChange(color, 'secondaryColor')}
      />

      <ColorPickerField
        label="Background Color"
        color={theme.backgroundColor}
        onChange={(color) => handleColorChange(color, 'backgroundColor')}
      />

      <ColorPickerField
        label="Text Color"
        color={theme.textColor}
        onChange={(color) => handleColorChange(color, 'textColor')}
      />

      <Stack spacing={2} w="100%">
        <Text fontWeight="medium">Font Family</Text>
        <Select value={theme.fontFamily} onChange={handleFontChange}>
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font.split(',')[0]}
            </option>
          ))}
        </Select>
      </Stack>

      <Stack spacing={2} w="100%">
        <Text fontWeight="medium">Logo</Text>
        <Box position="relative">
          {theme.logoUrl && (
            <Box mb={2}>
              <Image
                src={theme.logoUrl}
                alt="Logo"
                maxH="100px"
                objectFit="contain"
              />
              <IconButton
                aria-label="Remove logo"
                icon={<FiTrash2 />}
                size="sm"
                position="absolute"
                top={0}
                right={0}
                onClick={removeLogo}
              />
            </Box>
          )}
          <Button
            as="label"
            leftIcon={<FiUpload />}
            cursor="pointer"
            w="100%"
          >
            Upload Logo
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              display="none"
            />
          </Button>
        </Box>
      </Stack>
    </VStack>
  );
};
