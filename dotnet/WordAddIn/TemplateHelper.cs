using Microsoft.Office.Interop.Word;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace WordAddIn
{
    public class TemplateHelper
    {
        public static void loadCell(Document doc, Table table, Dictionary<String, WordReportingField> fieldInfo, Row row, Cell templateCell, Dictionary<String, object> collectionItem, int templateRowCount, BrowserDialog browserDialog)
        {
            if (templateRowCount == 1 &&
                ContentControlHelper.isSingleContentControlCell(templateCell) &&
                ContentControlHelper.isDirectContentControlType(templateCell))
            {
                directCellLoad(doc, table, fieldInfo, row, templateCell, collectionItem);
            }
            else
            {
                Cell newCell = row.Cells[templateCell.ColumnIndex];
                copyCellContent(templateCell, newCell);
                foreach (ContentControl cc in newCell.Range.ContentControls)
                {
                    TagInfo ti = TagInfo.create(cc);
                    if (ti != null)
                    {
                        if (ti.isSimple)
                            continue;
                        if (collectionItem.ContainsKey(ti.property))
                        {
                            Dictionary<String, object> entity = (Dictionary<String, object>)collectionItem[ti.property];
                            ContentControlHelper.setContentControl(doc, cc, entity, ti, null, fieldInfo, browserDialog, table);
                        }
                    }
                }
            }
        }

        public static void directCellLoad(Document doc, Table table, Dictionary<String, WordReportingField> fieldInfo, Row row, Cell templateCell, Dictionary<String, object> collectionItem)
        {
            Cell newCell = row.Cells[templateCell.ColumnIndex];
            ContentControl cc = templateCell.Range.ContentControls[1];
            TagInfo ti = TagInfo.create(cc);

            // only text controls at the moment !!!
            string value = null;
            string type = null;
            if (ti.isSimple == false)
            {
                WordReportingField field = null;
                try {
                    field = fieldInfo[ti.tag];
                } catch (Exception) {};

                Dictionary<String, object> entity = (Dictionary<String, object>)collectionItem[ti.property];
                if (ti.display == null)
                {
                    if (ti.isFormula && "$sum".Equals(ti.formula))
                    {
                        value = ContentControlHelper.calculateSum(doc, cc, entity, ti, null, field);
                    }
                    else
                    {
                        try { type = entity["$type"].ToString(); }
                        catch (Exception) { }

                        if (type != null && (type.Contains("x-document") || type.Contains("text/html") || type.Contains("text/rtf") || type.Contains("text/plain")))
                        {
                            ContentControlHelper.setContentControlClob(doc, cc, entity, field);
                            return;
                        }

                        value = TemplateUtils.parseValue(entity, type);
                        value = ReportingFieldUtil.formatValue(value, ReportingFieldUtil.getType(type), field);
                    }
                }
                else
                {
                    value = TemplateUtils.parseValue(entity, type, ti.display);
                }

                Cell tableCell = row.Cells[templateCell.ColumnIndex];
                tableCell.Range.Text = value;
            }
        }

        /// <summary>
        /// Store the start row and the number of template rows for a given table in the document's custom data.
        /// </summary>
        /// <param name="doc"></param>
        /// <param name="table"></param>
        /// <param name="collectionName"></param>
        /// <param name="startRow"></param>
        /// <param name="numRows"></param>
        public static void addMappedRowsCustomData(Document doc, Table table, TableInfo info, int startRow, int numRows)
        {
            if (info.templateRows.Count == 1)
            {
                SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
                if (customData != null)
                {
                    String mappedRowsStart = "mappedRowsStart-" + info.collectionName;
                    String mappedRowsCount = "mappedRowsCount-" + info.collectionName;

                    customData.setStringProperty(mappedRowsStart, "" + startRow);
                    customData.setStringProperty(mappedRowsCount, "" + numRows);
                    customData.writeDictionaryToDocument();
                }
            }
        }

        /// <summary>
        /// If a custom data entry exists for the mapped rows, then use this metadata to clear the associated template rows in the table.
        /// Due to performance issues with removing large numbers of rows, we instead clear the contents of the cells within the
        /// template rows. We then remove or add rows to the table to match the number of rows required.
        /// </summary>
        /// <param name="doc"></param>
        /// <param name="table"></param>
        /// <param name="info"></param>
        /// <param name="newRowCount"></param>
        public static bool clearMappedRows(Document doc, Table table, TableInfo info, int newRowCount)
        {
            bool dirty = false;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
            if (info.templateRows.Count == 1 && customData != null)
            {
                String mappedRowsStart = "mappedRowsStart-" + info.collectionName;
                String mappedRowsCount = "mappedRowsCount-" + info.collectionName;

                int startRow, rowCount;
                if (Int32.TryParse(customData.getStringProperty(mappedRowsStart, false), out startRow) &&
                    Int32.TryParse(customData.getStringProperty(mappedRowsCount, false), out rowCount))
                {

                    info.templateRows[0].Range.Font.Hidden = 0; // redisplay the hidden template row
                    startRow++; // template row now showing, so startRow is the row after...

                    if (startRow <= table.Rows.Count)
                    {
                        Cell cellTopLeft = table.Rows[startRow].Cells[1];
                        Cell cellBottomRight = table.Rows[Math.Min(startRow + rowCount - 1, table.Rows.Count)].Cells[table.Columns.Count];
                        doc.Range(cellTopLeft.Range.Start, cellBottomRight.Range.End).Delete();
                    }

                    if (table.Rows.Count < startRow + rowCount -1) // handle the case where the user has deleted rows in the table before the refresh
                    {
                        doc.Application.Selection.InsertRowsBelow(startRow + rowCount - table.Rows.Count - 1);
                    }

                    int newRowDelta = newRowCount - rowCount;
                    if (newRowDelta > 0)
                    {
                        doc.Application.Selection.InsertRowsBelow(newRowDelta);
                    }
                    else if (newRowDelta < 0)
                    {
                        for (int ii = startRow; ii < startRow + Math.Abs(newRowDelta); ii++)
                        {
                            table.Rows[ii].Delete();
                        }
                    }
                    dirty = true;
                }
            }
            return dirty;
        }

        public static bool isDirectTemplateRow(Document doc, Row row, TagInfo tag)
        {
            bool directTemplateRow = false;
            if (row.Index > 1)
            {
                SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
                if (customData != null)
                {
                    directTemplateRow = customData.getDictionary().ContainsKey("mappedRowsStart-" + tag.collection);
                }
            }
            return directTemplateRow;
        }

        private static void copyCellContent(Cell src, Cell dest)
        {
            foreach (ContentControl s in src.Range.ContentControls)
            {
                Range dr = dest.Range;
                dr.Collapse(WdCollapseDirection.wdCollapseStart);
                ContentControl d = dr.ContentControls.Add(s.Type);
                d.Tag = s.Tag;
                d.Title = s.Title;
            }
        }
    }
}
