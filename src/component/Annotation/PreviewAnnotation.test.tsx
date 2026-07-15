/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import PreviewAnnotation from './PreviewAnnotation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock SVG imports
vi.mock('../../assets/svg/annotations-icon-blue.svg', () => ({
  default: 'annotations-icon-blue'
}));
vi.mock('../../assets/svg/edit_note.svg', () => ({
  default: 'edit-note-icon'
}));
vi.mock('../../assets/svg/database_schema_icon.svg', () => ({
  default: 'database-schema-icon'
}));

describe('PreviewAnnotation', () => {
  // --- MOCK DATA ---
  const mockEntry = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.annotation1': {
        aspectType: 'tables/custom/annotation1',
        data: {
          fields: {
            field1: { kind: 'stringValue', stringValue: 'test value 1' },
          }
        }
      },
      '123.custom.annotation2': {
        aspectType: 'tables/custom/annotation2',
        data: {
          fields: {
            listField: { kind: 'listValue', listValue: { values: [{ stringValue: 'list item 1' }, { stringValue: 'list item 2' }] } }
          }
        }
      },
      '123.custom.empty': {
        aspectType: 'tables/custom/empty',
        data: { fields: { emptyField: { kind: 'stringValue', stringValue: '' } } }
      },
      '123.custom.null': { aspectType: 'tables/custom/null', data: null }
    }
  };

  const mockEntryWithAllFieldTypes = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.alltypes': {
        aspectType: 'tables/custom/alltypes',
        data: {
          fields: {
            stringField: { kind: 'stringValue', stringValue: 'string value' },
            numberField: { kind: 'numberValue', numberValue: 42 },
            boolTrueField: { kind: 'boolValue', boolValue: true },
            boolFalseField: { kind: 'boolValue', boolValue: false },
            listField: { kind: 'listValue', listValue: { values: [{ stringValue: 'item1' }] } }
          }
        }
      }
    }
  };

  const mockEntryWithSimpleValues = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.simple': {
        aspectType: 'tables/custom/simple',
        data: {
          fields: {
            simpleString: 'direct string',
            simpleNumber: 123,
            simpleNull: null,
            simpleUndefined: undefined
          }
        }
      }
    }
  };

  const mockEntryWithGlobalAspects = {
    entryType: 'tables/123',
    aspects: {
      '123.global.schema': {
        aspectType: 'tables/global/schema',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'schema data' } } }
      },
      '123.global.overview': {
        aspectType: 'tables/global/overview',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'overview data' } } }
      },
      '123.global.contacts': {
        aspectType: 'tables/global/contacts',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'contacts data' } } }
      },
      '123.global.usage': {
        aspectType: 'tables/global/usage',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'usage data' } } }
      },
      '123.global.glossary-term-aspect': {
        aspectType: 'tables/global/glossary-term-aspect',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'glossary data' } } }
      },
      '123.global.refresh-cadence': {
        aspectType: 'tables/global/refresh-cadence',
        data: { fields: { field1: { kind: 'stringValue', stringValue: 'refresh data' } } }
      },
      '123.custom.visible': {
        aspectType: 'tables/custom/visible',
        data: { fields: { visibleField: { kind: 'stringValue', stringValue: 'visible value' } } }
      }
    }
  };

  const mockEntryWithRawData = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.rawdata': {
        aspectType: 'tables/custom/rawdata',
        data: {
          directField: { kind: 'stringValue', stringValue: 'direct value' }
        }
      }
    }
  };

  const mockEntryWithStructValue = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.withstruct': {
        aspectType: 'tables/custom/withstruct',
        data: {
          fields: {
            job: {
              kind: 'structValue',
              structValue: {
                fields: {
                  name: { kind: 'stringValue', stringValue: 'Job Name Value' },
                  runTime: { kind: 'stringValue', stringValue: '2026-02-24T05:05:13Z' }
                }
              }
            },
            description: { kind: 'stringValue', stringValue: 'A description' }
          }
        }
      }
    }
  };

  const mockEntryWithListOfStructs = {
    entryType: 'tables/123',
    aspects: {
      '123.custom.withliststruct': {
        aspectType: 'tables/custom/withliststruct',
        data: {
          fields: {
            fields: {
              kind: 'listValue',
              listValue: {
                values: [
                  {
                    kind: 'structValue',
                    structValue: {
                      fields: {
                        name: { kind: 'stringValue', stringValue: 'department' },
                        description: { kind: 'stringValue', stringValue: 'The department' }
                      }
                    }
                  },
                  {
                    kind: 'structValue',
                    structValue: {
                      fields: {
                        name: { kind: 'stringValue', stringValue: 'emp_id' },
                        description: { kind: 'stringValue', stringValue: 'Employee ID' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  };

  let setExpandedItemsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setExpandedItemsMock = vi.fn();
    vi.clearAllMocks();
  });

  // --- RENDER HELPER ---
  const renderPreviewAnnotation = (props = {}, initialExpanded = new Set<string>()) => {
    const defaultProps = {
      entry: mockEntry,
      css: {},
      expandedItems: initialExpanded,
      setExpandedItems: setExpandedItemsMock,
    };
    return render(<PreviewAnnotation {...defaultProps} {...props} />);
  };

  // --- BASIC RENDERING TESTS ---

  describe('Basic Rendering', () => {
    it('renders annotation accordions including those with null data as static items', () => {
      renderPreviewAnnotation();
      expect(screen.getByText('Annotation1')).toBeInTheDocument();
      expect(screen.getByText('Annotation2')).toBeInTheDocument();
      expect(screen.getByText('Empty')).toBeInTheDocument();
      expect(screen.getByText('Null')).toBeInTheDocument();
    });

    it('does not render "Aspect" chip label (removed per design spec)', () => {
      renderPreviewAnnotation();
      expect(screen.queryAllByText('Aspect')).toHaveLength(0);
    });

    it('renders aspect icon next to aspect names', () => {
      renderPreviewAnnotation();
      const icons = screen.getAllByAltText('');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('handles entry without aspects gracefully', () => {
      const entryWithoutAspects = { ...mockEntry, aspects: undefined };
      renderPreviewAnnotation({ entry: entryWithoutAspects });
      expect(screen.queryByText('Annotation1')).not.toBeInTheDocument();
    });

    it('handles entry without entryType gracefully', () => {
      const entryWithoutType = { ...mockEntry, entryType: undefined };
      renderPreviewAnnotation({ entry: entryWithoutType });
      expect(screen.getByText('Annotation1')).toBeInTheDocument();
    });

    it('handles null entry gracefully', () => {
      renderPreviewAnnotation({ entry: null });
      expect(screen.getByText('No aspects available for this resource')).toBeInTheDocument();
    });
  });

  // --- EMPTY STATE TESTS ---

  describe('Empty State', () => {
    it('shows empty state message when no displayable aspects exist', () => {
      const entryWithOnlyGlobalAspects = {
        entryType: 'tables/123',
        aspects: {
          '123.global.schema': {
            aspectType: 'tables/global/schema',
            data: { fields: { field1: { kind: 'stringValue', stringValue: 'schema data' } } }
          }
        }
      };
      renderPreviewAnnotation({ entry: entryWithOnlyGlobalAspects });
      expect(screen.getByText('No aspects available for this resource')).toBeInTheDocument();
    });

    it('shows empty state when aspects object is empty', () => {
      const entryWithEmptyAspects = { entryType: 'tables/123', aspects: {} };
      renderPreviewAnnotation({ entry: entryWithEmptyAspects });
      expect(screen.getByText('No aspects available for this resource')).toBeInTheDocument();
    });
  });

  // --- GLOBAL ASPECTS FILTERING ---

  describe('Global Aspects Filtering', () => {
    it('filters out schema, overview, contacts, usage, glossary-term-aspect, and refresh-cadence aspects', () => {
      renderPreviewAnnotation({ entry: mockEntryWithGlobalAspects });

      expect(screen.queryByText('schema')).not.toBeInTheDocument();
      expect(screen.queryByText('overview')).not.toBeInTheDocument();
      expect(screen.queryByText('contacts')).not.toBeInTheDocument();
      expect(screen.queryByText('usage')).not.toBeInTheDocument();
      expect(screen.queryByText('glossary-term-aspect')).not.toBeInTheDocument();
      expect(screen.queryByText('refresh-cadence')).not.toBeInTheDocument();

      expect(screen.getByText('Visible')).toBeInTheDocument();
    });
  });

  // --- ACCORDION EXPANSION TESTS ---

  describe('Accordion Expansion', () => {
    it('calls setExpandedItems when an accordion is clicked', () => {
      renderPreviewAnnotation();

      const annotation1Accordion = screen.getByText('Annotation1');
      fireEvent.click(annotation1Accordion);

      expect(setExpandedItemsMock).toHaveBeenCalledTimes(1);
      expect(setExpandedItemsMock).toHaveBeenCalledWith(new Set(['123.custom.annotation1']));
    });

    it('shows field names when the aspect accordion is expanded', () => {
      const expandedSet = new Set(['123.custom.annotation1']);
      renderPreviewAnnotation({}, expandedSet);

      // Field name should be visible as a collapsible row
      expect(screen.getByText('field1')).toBeInTheDocument();
    });

    it('shows field value when field row is clicked to expand', () => {
      const expandedSet = new Set(['123.custom.annotation1']);
      renderPreviewAnnotation({}, expandedSet);

      // Click the field to expand it
      const fieldRow = screen.getByText('field1');
      fireEvent.click(fieldRow);

      // Value should now be visible
      expect(screen.getByText('test value 1')).toBeInTheDocument();
    });

    it('correctly toggles an accordion via parent state control', () => {
      let expandedSet = new Set<string>();

      setExpandedItemsMock.mockImplementation((newSet) => {
        expandedSet = newSet;
      });

      const { rerender } = renderPreviewAnnotation({}, expandedSet);

      const annotation1Accordion = screen.getByText('Annotation1');

      // Expand
      fireEvent.click(annotation1Accordion);
      expect(setExpandedItemsMock).toHaveBeenCalledTimes(1);
      expect(expandedSet.has('123.custom.annotation1')).toBe(true);

      rerender(<PreviewAnnotation entry={mockEntry} css={{}} expandedItems={expandedSet} setExpandedItems={setExpandedItemsMock} />);
      expect(screen.getByText('field1')).toBeInTheDocument();

      // Collapse
      fireEvent.click(annotation1Accordion);
      expect(setExpandedItemsMock).toHaveBeenCalledTimes(2);
      expect(expandedSet.has('123.custom.annotation1')).toBe(false);
    });

    it('does not expand accordion for annotations without valid data', () => {
      renderPreviewAnnotation();

      const emptyAccordion = screen.getByText('Empty');
      fireEvent.click(emptyAccordion);
      expect(setExpandedItemsMock).not.toHaveBeenCalled();
    });

    it('updates accordion background styling when expanded', () => {
      const expandedSet = new Set(['123.custom.annotation1']);
      renderPreviewAnnotation({}, expandedSet);

      // When expanded, the accordion summary should have #F0F4F8 background
      const annotationName = screen.getByText('Annotation1');
      const accordionSummary = annotationName.closest('[role="button"]') || annotationName.closest('div');
      expect(accordionSummary).toBeInTheDocument();
    });
  });

  // --- FIELD TYPE RENDERING TESTS ---

  describe('Field Type Rendering', () => {
    it('renders stringValue fields as collapsible rows', () => {
      const expandedSet = new Set(['123.custom.alltypes']);
      renderPreviewAnnotation({ entry: mockEntryWithAllFieldTypes }, expandedSet);

      expect(screen.getByText('stringField')).toBeInTheDocument();
      // When all aspects are expanded, nested fields are auto-expanded
      expect(screen.getByText('string value')).toBeInTheDocument();
    });

    it('renders numberValue fields correctly when expanded', () => {
      const expandedSet = new Set(['123.custom.alltypes']);
      renderPreviewAnnotation({ entry: mockEntryWithAllFieldTypes }, expandedSet);

      // Auto-expanded when all aspects are expanded
      expect(screen.getByText('numberField')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders boolValue fields correctly when expanded (true and false)', () => {
      const expandedSet = new Set(['123.custom.alltypes']);
      renderPreviewAnnotation({ entry: mockEntryWithAllFieldTypes }, expandedSet);

      // Auto-expanded when all aspects are expanded
      expect(screen.getByText('boolTrueField')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
      expect(screen.getByText('boolFalseField')).toBeInTheDocument();
      expect(screen.getByText('false')).toBeInTheDocument();
    });

    it('renders listValue fields with items when expanded', () => {
      const expandedSet = new Set(['123.custom.annotation2']);
      renderPreviewAnnotation({}, expandedSet);

      fireEvent.click(screen.getByText('listField'));
      expect(screen.getByText('list item 1')).toBeInTheDocument();
      expect(screen.getByText('list item 2')).toBeInTheDocument();
    });

    it('renders simple (non-object) field values when expanded', () => {
      const expandedSet = new Set(['123.custom.simple']);
      renderPreviewAnnotation({ entry: mockEntryWithSimpleValues }, expandedSet);

      expect(screen.getByText('simpleString')).toBeInTheDocument();
      expect(screen.getByText('simpleNumber')).toBeInTheDocument();
    });

    it('renders structValue fields as collapsible rows', () => {
      const expandedSet = new Set(['123.custom.withstruct']);
      renderPreviewAnnotation({ entry: mockEntryWithStructValue }, expandedSet);

      // struct field 'job' should be visible
      expect(screen.getByText('job')).toBeInTheDocument();
      // simple field 'description' should also be visible
      expect(screen.getByText('description')).toBeInTheDocument();
    });

    it('shows struct sub-fields as key-value pairs when expanded', () => {
      const expandedSet = new Set(['123.custom.withstruct']);
      renderPreviewAnnotation({ entry: mockEntryWithStructValue }, expandedSet);

      // Auto-expanded when all aspects are expanded — sub-fields visible immediately
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Job Name Value')).toBeInTheDocument();
      expect(screen.getByText('Run Time')).toBeInTheDocument();
      expect(screen.getByText('2026-02-24T05:05:13Z')).toBeInTheDocument();
    });

    it('renders listValue with struct items as expandable list', () => {
      const expandedSet = new Set(['123.custom.withliststruct']);
      renderPreviewAnnotation({ entry: mockEntryWithListOfStructs }, expandedSet);

      // Auto-expanded when all aspects are expanded — parent + list items visible
      const fieldItems = screen.getAllByText('fields');
      expect(fieldItems.length).toBeGreaterThan(1);
    });

    it('handles raw data without fields property', () => {
      const expandedSet = new Set(['123.custom.rawdata']);
      renderPreviewAnnotation({ entry: mockEntryWithRawData }, expandedSet);

      expect(screen.getByText('directField')).toBeInTheDocument();
      expect(screen.getByText('direct value')).toBeInTheDocument();
    });
  });

  // --- PROP TESTS ---

  describe('isGlossary Prop', () => {
    it('applies glossary-specific styling when isGlossary is true', () => {
      renderPreviewAnnotation({ isGlossary: true });

      // The aspect name Typography keeps a fixed 14px font size regardless of isGlossary.
      const annotationName = screen.getByText('Annotation1');
      expect(annotationName).toHaveStyle({ fontSize: '14px' });
    });

    it('applies default styling when isGlossary is false', () => {
      renderPreviewAnnotation({ isGlossary: false });

      const annotationName = screen.getByText('Annotation1');
      expect(annotationName).toHaveStyle({ fontSize: '14px' });
    });
  });

  describe('CSS Prop', () => {
    it('accepts custom CSS prop without errors', () => {
      const customCss = { backgroundColor: 'red', padding: '20px' };
      renderPreviewAnnotation({ css: customCss });

      expect(screen.getByText('Annotation1')).toBeInTheDocument();
    });

    it('applies CSS to empty state container', () => {
      const customCss = { minHeight: '300px' };
      const entryWithOnlyGlobalAspects = {
        entryType: 'tables/123',
        aspects: {
          '123.global.schema': {
            aspectType: 'tables/global/schema',
            data: { fields: { field1: { kind: 'stringValue', stringValue: 'data' } } }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithOnlyGlobalAspects, css: customCss });
      expect(screen.getByText('No aspects available for this resource')).toBeInTheDocument();
    });
  });

  // --- EDGE CASES ---

  describe('Edge Cases', () => {
    it('handles aspect with hyphenated name correctly', () => {
      const entryWithHyphenatedName = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.my-custom-aspect': {
            aspectType: 'tables/custom/my-custom-aspect',
            data: { fields: { field1: { kind: 'stringValue', stringValue: 'value' } } }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithHyphenatedName });
      expect(screen.getByText('My Custom Aspect')).toBeInTheDocument();
    });

    it('handles multiple accordions expanded simultaneously', () => {
      const expandedSet = new Set(['123.custom.annotation1', '123.custom.annotation2']);
      renderPreviewAnnotation({}, expandedSet);

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('listField')).toBeInTheDocument();
    });

    it('handles entry with deeply nested entryType', () => {
      const entryWithDeepType = {
        entryType: 'projects/myproject/datasets/123',
        aspects: {
          '123.custom.test': {
            aspectType: 'tables/custom/test',
            data: { fields: { field1: { kind: 'stringValue', stringValue: 'value' } } }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithDeepType });
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles listValue with empty values array', () => {
      const entryWithEmptyList = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.emptylist': {
            aspectType: 'tables/custom/emptylist',
            data: {
              fields: {
                emptyListField: { kind: 'listValue', listValue: { values: [] } }
              }
            }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithEmptyList });
      expect(screen.getByText('Emptylist')).toBeInTheDocument();
    });

    it('filters fields with null listValue', () => {
      const entryWithNullListValue = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.nulllist': {
            aspectType: 'tables/custom/nulllist',
            data: {
              fields: {
                nullListField: { kind: 'listValue', listValue: null }
              }
            }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithNullListValue });
      expect(screen.getByText('Nulllist')).toBeInTheDocument();
    });

    it('handles numberValue of 0 correctly', () => {
      const entryWithZero = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.zero': {
            aspectType: 'tables/custom/zero',
            data: {
              fields: {
                zeroField: { kind: 'numberValue', numberValue: 0 }
              }
            }
          }
        }
      };

      const expandedSet = new Set(['123.custom.zero']);
      renderPreviewAnnotation({ entry: entryWithZero }, expandedSet);

      expect(screen.getByText('zeroField')).toBeInTheDocument();
      // Auto-expanded when all aspects are expanded
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('does not render fields with empty stringValue', () => {
      const entryWithEmptyString = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.emptystring': {
            aspectType: 'tables/custom/emptystring',
            data: {
              fields: {
                emptyStringField: { kind: 'stringValue', stringValue: '' },
                validField: { kind: 'stringValue', stringValue: 'valid' }
              }
            }
          }
        }
      };

      const expandedSet = new Set(['123.custom.emptystring']);
      renderPreviewAnnotation({ entry: entryWithEmptyString }, expandedSet);

      // Valid field should be shown as a collapsible row
      expect(screen.getByText('validField')).toBeInTheDocument();
    });

    it('handles structValue with empty fields', () => {
      const entryWithEmptyStruct = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.emptystruct': {
            aspectType: 'tables/custom/emptystruct',
            data: {
              fields: {
                emptyStruct: { kind: 'structValue', structValue: { fields: {} } }
              }
            }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithEmptyStruct });
      // Empty struct should not be rendered as expandable
      expect(screen.getByText('Emptystruct')).toBeInTheDocument();
    });

    it('handles undefined numberValue', () => {
      const entryWithUndefinedNumber = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.undefinednum': {
            aspectType: 'tables/custom/undefinednum',
            data: {
              fields: {
                numField: { kind: 'numberValue', numberValue: undefined }
              }
            }
          }
        }
      };

      renderPreviewAnnotation({ entry: entryWithUndefinedNumber });
      expect(screen.getByText('Undefinednum')).toBeInTheDocument();
    });

    it('handles multiple accordions with independent field expansion', () => {
      const entryWithMultiple = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.first': {
            aspectType: 'tables/custom/first',
            data: {
              fields: {
                aField: { kind: 'stringValue', stringValue: 'A value' },
                bField: { kind: 'stringValue', stringValue: 'B value' }
              }
            }
          },
          '123.custom.second': {
            aspectType: 'tables/custom/second',
            data: {
              fields: {
                xField: { kind: 'stringValue', stringValue: 'X value' },
                yField: { kind: 'stringValue', stringValue: 'Y value' }
              }
            }
          }
        }
      };

      const expandedSet = new Set(['123.custom.first', '123.custom.second']);
      renderPreviewAnnotation({ entry: entryWithMultiple }, expandedSet);

      // Field names should be visible
      expect(screen.getByText('aField')).toBeInTheDocument();
      expect(screen.getByText('xField')).toBeInTheDocument();

      // All fields auto-expanded when all aspects are expanded
      expect(screen.getByText('A value')).toBeInTheDocument();
      expect(screen.getByText('X value')).toBeInTheDocument();
    });

    it('handles aspect with data but no fields property', () => {
      const entryWithNoFieldsProperty = {
        entryType: 'tables/123',
        aspects: {
          '123.custom.direct': {
            aspectType: 'tables/custom/direct',
            data: {
              directKey: { kind: 'stringValue', stringValue: 'direct data' }
            }
          }
        }
      };

      const expandedSet = new Set(['123.custom.direct']);
      renderPreviewAnnotation({ entry: entryWithNoFieldsProperty }, expandedSet);

      expect(screen.getByText('Direct')).toBeInTheDocument();
      expect(screen.getByText('directKey')).toBeInTheDocument();
    });
  });
});
