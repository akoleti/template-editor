'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Grip, Image, Type, PenTool, Table, Loader } from 'lucide-react';

const TemplateEditor = ({ templateId = null }: { templateId?: string | null }) => {
  const [elements, setElements] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const resizingElement = useRef(null);
  const startResizePos = useRef(null);

  const elementTypes = [
    { id: 'logo', label: 'Company Logo', icon: Image },
    { id: 'text', label: 'Text Block', icon: Type },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'signature', label: 'Signature', icon: PenTool },
    { id: 'table', label: 'Table', icon: Table }
  ];

  useEffect(() => {
    if (templateId) {
      fetchTemplateData();
    } else {
      // Initialize empty template if no ID
      setElements([]);
      setTemplateName('');
      setIsPublic(false);
    }
  }, [templateId]);

  const fetchTemplateData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();
      setElements(data.elements || []);
      setTemplateName(data.name || '');
      setIsPublic(data.isPublic || false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSidebarDragStart = (e, type) => {
    e.dataTransfer.setData('type', type.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.target.classList.add('opacity-50');
    e.dataTransfer.setData('elementId', elements[index].id);
    
    // Create a drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.opacity = '0.5';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
    e.target.classList.add('border-blue-500');
  };

  const handleDragLeave = (e) => {
    e.target.classList.remove('border-blue-500');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50');
    handleSort();
  };

  const handleDrop = (e, dropZone = null) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const elementId = e.dataTransfer.getData('elementId');
    
    const dropX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const dropY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    
    if (type) {
      // New element from sidebar
      const newElement = {
        id: `element-${Date.now()}`,
        type,
        content: '',
        size: { width: 200, height: type === 'text' ? 100 : 150 },
        position: { x: dropX, y: dropY },
        row: dropZone?.row || Math.floor(dropY / 150)
      };
      setElements([...elements, newElement]);
    } else if (elementId) {
      // Moving existing element
      setElements(prevElements => 
        prevElements.map(el => 
          el.id === elementId
            ? { ...el, position: { x: dropX, y: dropY }, row: dropZone?.row || Math.floor(dropY / 150) }
            : el
        )
      );
    }
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const items = [...elements];
      const draggedItem = items[dragItem.current];
      items.splice(dragItem.current, 1);
      items.splice(dragOverItem.current, 0, draggedItem);
      dragItem.current = null;
      dragOverItem.current = null;
      setElements(items);
    }
  };

  const handleResizeStart = (e, elementId) => {
    e.preventDefault();
    resizingElement.current = elementId;
    startResizePos.current = {
      x: e.clientX,
      y: e.clientY,
      size: elements.find(el => el.id === elementId)?.size || { width: 200, height: 150 }
    };

    const handleResizeMove = (moveEvent) => {
      if (!resizingElement.current || !startResizePos.current) return;

      const deltaWidth = moveEvent.clientX - startResizePos.current.x;
      const deltaHeight = moveEvent.clientY - startResizePos.current.y;

      const newWidth = Math.max(100, startResizePos.current.size.width + deltaWidth);
      const newHeight = Math.max(50, startResizePos.current.size.height + deltaHeight);

      setElements(prevElements =>
        prevElements.map(el =>
          el.id === resizingElement.current
            ? { ...el, size: { width: newWidth, height: newHeight } }
            : el
        )
      );
    };

    const handleResizeEnd = () => {
      resizingElement.current = null;
      startResizePos.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handleLogoUpload = async (e, elementId) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        setElements(prevElements =>
          prevElements.map(el =>
            el.id === elementId
              ? { ...el, content: { url: data.url } }
              : el
          )
        );
      } catch (error) {
        console.error('Error uploading logo:', error);
      }
    }
  };

  const updateElementContent = (elementId, content) => {
    setElements(prevElements =>
      prevElements.map(el =>
        el.id === elementId
          ? { ...el, content }
          : el
      )
    );
  };

  const renderElement = (element) => {
    const content = (
      <div
        style={{
          width: element.size?.width || '100%',
          height: element.size?.height || 'auto',
          position: 'relative'
        }}
      >
        {element.type === 'logo' && (
          <div className="relative w-full h-full">
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded border-2 border-dashed border-gray-200">
              {element.content?.url ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={element.content.url} 
                    alt="Company Logo" 
                    className="max-h-full max-w-full object-contain"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'image/*';
                      fileInput.onchange = (e) => handleLogoUpload(e, element.id);
                      fileInput.click();
                    }}
                  >
                    Change Logo
                  </Button>
                </div>
              ) : (
                <div className="text-center p-4">
                  <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-2">Upload company logo</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'image/*';
                      fileInput.onchange = (e) => handleLogoUpload(e, element.id);
                      fileInput.click();
                    }}
                  >
                    Select Logo
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        {element.type === 'text' && (
          <Textarea
            placeholder="Enter text here..."
            className="w-full h-full min-h-24 resize-none"
            value={element.content || ''}
            onChange={(e) => updateElementContent(element.id, e.target.value)}
          />
        )}
        {element.type === 'image' && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
            <p className="text-gray-500">Drop image here</p>
          </div>
        )}
        {element.type === 'signature' && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
            <p className="text-gray-500">Signature field</p>
          </div>
        )}
        {element.type === 'table' && (
          <div className="h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
            <p className="text-gray-500">Table element</p>
          </div>
        )}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-white border border-gray-300 rounded-sm"
          onMouseDown={(e) => handleResizeStart(e, element.id)}
        />
      </div>
    );

    return content;
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          elements,
          isPublic
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save template');
      }
      
      const data = await response.json();
      console.log('Template saved:', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Template Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="public">Make Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="grid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
                <Label htmlFor="grid">Show Grid</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Elements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {elementTypes.map((type) => (
                  <div
                    key={type.id}
                    draggable
                    onDragStart={(e) => handleSidebarDragStart(e, type)}
                    className="cursor-move"
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <type.icon className="w-4 h-4 mr-2" />
                      {type.label}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <Card>
            <CardContent className="p-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="min-h-96 border-2 border-dashed border-gray-200 rounded-lg p-4 relative"
                style={{ 
                  minHeight: '600px',
                  backgroundImage: showGrid ? 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)' : 'none',
                  backgroundSize: '20px 20px'
                }}
              >
                {/* Snap guides */}
                {elements.map((element) => (
                  <div
                    key={`guide-${element.id}`}
                    className="absolute pointer-events-none border-2 border-blue-200 opacity-0 group-hover:opacity-100"
                    style={{
                      left: element.position?.x || 0,
                      top: element.position?.y || 0,
                      width: element.size?.width || 200,
                      height: element.size?.height || 150,
                      transition: 'opacity 0.2s'
                    }}
                  />
                ))}
                {elements.map((element, index) => (
                  <div
                    key={element.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative group bg-white border rounded-lg shadow-sm p-4 transition-all duration-200"
                  >
                    <div className="absolute left-2 top-2 cursor-move">
                      <Grip className="w-4 h-4 text-gray-400" />
                    </div>
                    {renderElement(element)}
                  </div>
                ))}
                {elements.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Drag elements here to build your template
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave}>Save Template</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;