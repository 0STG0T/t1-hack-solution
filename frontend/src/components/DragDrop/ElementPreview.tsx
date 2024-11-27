import React, { useEffect, useState } from 'react';
import {
    VStack,
    Box,
    Text,
    Input,
    Select,
    FormControl,
    FormLabel,
    Button,
    useColorMode,
    Tabs,
    TabsList,
    TabPanels,
    TabPanel,
    Tab,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
} from '@chakra-ui/react';
import { ElementConfig } from '../../types/dragDrop';
import { useWebSocket } from '../WebSocketProvider';

interface ElementPreviewProps {
    element: ElementConfig | null;
    onUpdate: (element: ElementConfig) => void;
}

export const ElementPreview: React.FC<ElementPreviewProps> = ({
    element,
    onUpdate,
}) => {
    const [localConfig, setLocalConfig] = useState<ElementConfig['config']>({});
    const { colorMode } = useColorMode();
    const { sendMessage } = useWebSocket();
    const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.600';

    useEffect(() => {
        if (element) {
            setLocalConfig(element.config);
        }
    }, [element]);

    if (!element) {
        return (
            <Box p={4} textAlign="center" color="gray.500">
                <Text>Select an element to customize</Text>
            </Box>
        );
    }

    const handleConfigUpdate = (
        key: string,
        value: string | string[] | Record<string, string>
    ) => {
        const updatedConfig = {
            ...localConfig,
            [key]: value,
        };
        setLocalConfig(updatedConfig);
        const updatedElement = {
            ...element,
            config: updatedConfig,
        };
        onUpdate(updatedElement);

        // Send real-time update via WebSocket
        sendMessage('element_updated', {
            elementId: element.id,
            config: updatedConfig
        });
    };

    const handleStyleUpdate = (key: string, value: string) => {
        const updatedStyle = {
            ...localConfig.style,
            [key]: value,
        };
        handleConfigUpdate('style', updatedStyle);
    };

    return (
        <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" p={4}>
            <Tabs>
                <TabsList>
                    <Tab>Properties</Tab>
                    <Tab>Style</Tab>
                </TabsList>

                <TabPanels>
                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <FormControl>
                                <FormLabel>Label</FormLabel>
                                <Input
                                    value={element.label}
                                    onChange={(e) =>
                                        onUpdate({ ...element, label: e.target.value })
                                    }
                                />
                            </FormControl>

                            {element.type === 'text' && (
                                <FormControl>
                                    <FormLabel>Placeholder</FormLabel>
                                    <Input
                                        value={localConfig.placeholder || ''}
                                        onChange={(e) =>
                                            handleConfigUpdate('placeholder', e.target.value)
                                        }
                                    />
                                </FormControl>
                            )}

                            {element.type === 'button' && (
                                <FormControl>
                                    <FormLabel>Button Text</FormLabel>
                                    <Input
                                        value={localConfig.text || ''}
                                        onChange={(e) =>
                                            handleConfigUpdate('text', e.target.value)
                                        }
                                    />
                                </FormControl>
                            )}

                            {element.type === 'select' && (
                                <FormControl>
                                    <FormLabel>Options (comma-separated)</FormLabel>
                                    <Input
                                        value={(localConfig.options || []).join(',')}
                                        onChange={(e) =>
                                            handleConfigUpdate(
                                                'options',
                                                e.target.value.split(',').map((s) => s.trim())
                                            )
                                        }
                                    />
                                </FormControl>
                            )}
                        </VStack>
                    </TabPanel>

                    <TabPanel>
                        <VStack spacing={4} align="stretch">
                            <FormControl>
                                <FormLabel>Width</FormLabel>
                                <Input
                                    value={localConfig.style?.width || ''}
                                    onChange={(e) => handleStyleUpdate('width', e.target.value)}
                                    placeholder="e.g., 200px or 100%"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Height</FormLabel>
                                <Input
                                    value={localConfig.style?.height || ''}
                                    onChange={(e) => handleStyleUpdate('height', e.target.value)}
                                    placeholder="e.g., 40px"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Background Color</FormLabel>
                                <Input
                                    type="color"
                                    value={localConfig.style?.backgroundColor || '#ffffff'}
                                    onChange={(e) =>
                                        handleStyleUpdate('backgroundColor', e.target.value)
                                    }
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Text Color</FormLabel>
                                <Input
                                    type="color"
                                    value={localConfig.style?.color || '#000000'}
                                    onChange={(e) => handleStyleUpdate('color', e.target.value)}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Font Size ({localConfig.style?.fontSize || '14px'})</FormLabel>
                                <Slider
                                    min={8}
                                    max={32}
                                    step={1}
                                    value={parseInt(localConfig.style?.fontSize || '14')}
                                    onChange={(value) => handleStyleUpdate('fontSize', `${value}px`)}
                                >
                                    <SliderTrack>
                                        <SliderFilledTrack />
                                    </SliderTrack>
                                    <SliderThumb />
                                </Slider>
                            </FormControl>
                        </VStack>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
};
