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
        public static bool isSingleContentControlCell(Cell cell)
        {
            return cell.Range.ContentControls.Count == 1;
        }

        public static bool isDirectContentControlType(ContentControl cc) 
        {
            return cc.Type == WdContentControlType.wdContentControlText;
        }

        public static void loadCell(Document doc, Table table, Dictionary<String, WordReportingField> fieldInfo, Row row, Cell templateCell, Dictionary<String, object> collectionItem, int templateRowCount, BrowserDialog browserDialog)
        {
            if (templateRowCount == 1 &&
                isSingleContentControlCell(templateCell) &&
                isDirectContentControlType(templateCell.Range.ContentControls[1]))
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

                if (String.IsNullOrEmpty(cc.Range.Text) == false && cc.Range.Text.Contains("DISPLAYBARCODE"))
                {
                    // to make the field code changeable
                    doc.ToggleFormsDesign();
                    Range aFieldCode = ((Field)cc.Range.Fields[1]).Code;
                    var prop1 = Regex.Match(aFieldCode.Text, "\"[^\"]*\"");
                    if ((prop1.ToString() != "") && (value != " "))
                    {
                        aFieldCode.Text = aFieldCode.Text.Replace(prop1.ToString(), "\"" + value + "\"");
                    }
                    else
                    {
                        aFieldCode.Text = "";
                    }
                    doc.ToggleFormsDesign();
                }
                else
                {
                    Cell tableCell = row.Cells[templateCell.ColumnIndex];
                    tableCell.Range.Text = value;
                }
            }
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
