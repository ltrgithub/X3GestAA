using Microsoft.Office.Interop.Word;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace WordAddIn
{
    public static class ContentControlHelper
    {
        public static Regex sumRegex = new Regex("\\$sum\\((?<exp>.*)\\)");
        private static string officeVersion = Globals.WordAddIn.Application.Version;

        public static List<ContentControl> GetAllContentControls(Document doc)
        {
            List<ContentControl> list = new List<ContentControl>();
            foreach (Range range in doc.StoryRanges)
            {
                try
                {
                    foreach (ContentControl cc in range.ContentControls)
                    {
                        if (!list.Contains(cc))
                        {
                            list.Add(cc);
                        }
                    }
                    foreach (Microsoft.Office.Interop.Word.Shape shape in range.ShapeRange)
                    {
                        foreach (ContentControl cc in shape.TextFrame.TextRange.ContentControls)
                        {
                            if (!list.Contains(cc))
                            {
                                list.Add(cc);
                            }
                        }
                    }
                }
                catch (Exception) { }
            }
            return list;
        }

        public static void setContentControl(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, Dictionary<String, WordReportingField> fieldInfo, BrowserDialog browserDialog, Table table)
        {
            WordReportingField field = null;
            try { field = fieldInfo[ti.tag]; }
            catch (Exception) { };
            if (ctrl.Type == WdContentControlType.wdContentControlPicture)
            {
                if ((table != null) && (officeVersion == "15.0" || officeVersion == "16.0"))
                {
                    table.Range.Font.Hidden = 0;
                }
                setContentControlImage(doc, ctrl, entity, ti, allData, browserDialog);
                if ((table != null) && (officeVersion == "15.0" || officeVersion == "16.0"))
                {
                    table.Range.Font.Hidden = 1;
                }
            }
            else if (ctrl.Type == WdContentControlType.wdContentControlText)
            {
                setContentControlText(doc, ctrl, entity, ti, allData, field);
                addLinkToContentControl(doc, ctrl, entity);
            }
        }

        public static void setContentControlText(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, WordReportingField field)
        {
            string value = null;
            string type = null;

            if (ti.display == null)
            {
                if (ti.isFormula && "$sum".Equals(ti.formula))
                {
                    value = calculateSum(doc, ctrl, entity, ti, allData, field);
                }
                else
                {
                    try { type = entity["$type"].ToString(); }
                    catch (Exception) { }

                    if (type != null && (type.Contains("x-document") || type.Contains("text/html") || type.Contains("text/rtf") || type.Contains("text/plain")))
                    {
                        setContentControlClob(doc, ctrl, entity, field);
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

            if (String.IsNullOrEmpty(ctrl.Range.Text) == false && ctrl.Range.Text.Contains("DISPLAYBARCODE"))
            {
                // to make the field code changeable
                doc.ToggleFormsDesign();
                Range aFieldCode = ((Field)ctrl.Range.Fields[1]).Code;
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
                ctrl.Range.Text = value;
            }
        }

        private static void setBarcode(Document doc, Range aRange, Dictionary<String, object> entity, string ti, Dictionary<String, object> allData, WordReportingField field)
        {
            string value = null;
            string type = null;

            value = TemplateUtils.parseValue(entity, type);
            value = ReportingFieldUtil.formatValue(value, ReportingFieldUtil.getType(type), field);

            try
            {
                aRange.Text = aRange.Text.Replace("<" + ti + ">", value);
            }
            catch (Exception) { }
        }

        public static void setContentControlClob(Document doc, ContentControl ctrl, Dictionary<string, object> entity, WordReportingField field)
        {
            object o = null;
            try
            {
                o = ((Dictionary<String, object>)entity["$value"])["$value"];
            }
            catch (Exception) { }
            if (o == null)
            {
                ctrl.Range.Text = "";
                return;
            }

            Range r = ctrl.Range;
            String text = o.ToString();
            System.Windows.Forms.RichTextBox rtBox = new System.Windows.Forms.RichTextBox();
            if (text.ToLower().StartsWith("{\\rtf"))
            {
                ctrl.MultiLine = true;
                rtBox.Rtf = text;
                r.Text = rtBox.Text;
            }
            else if (text.ToLower().StartsWith("<html>"))
            {
                // TODO: HTML Does not work at the moment
                r.Text = text;
            }
            else
            {
                r.Text = text;
            }
        }

        public static string calculateSum(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, WordReportingField field)
        {
            try
            {
                Dictionary<String, object> propData = (Dictionary<String, object>)allData[ti.collection];
                object[] items = null;
                string proptype = propData["$type"].ToString();
                if ("application/x-array".Equals(proptype))
                {
                    if (propData.ContainsKey("$items"))
                    {
                        items = (object[])propData["$items"];
                    }
                }
                if (items == null)
                {
                    return "<error>";
                }


                int scale = 2;
                if (propData.ContainsKey("$scale"))
                {
                    scale = (int)propData["$scale"];
                }

                string itemtype = ctrl.Title;
                ReportingFieldTypes type = ReportingFieldUtil.getType(itemtype);
                Decimal sumDecimal = 0;
                string sumString = null;
                foreach (object record in items)
                {
                    Dictionary<String, object> item = (Dictionary<String, object>)((Dictionary<String, object>)record)[ti.property];
                    string value = TemplateUtils.parseValue(item, itemtype);
                    switch (type)
                    {
                        case ReportingFieldTypes.DECIMAL:
                            Decimal d = Decimal.Parse(value);
                            sumDecimal += d;
                            break;
                        case ReportingFieldTypes.INTEGER:
                            Int64 i = Int64.Parse(value);
                            sumDecimal += i;
                            break;
                        default:
                            if (sumString != null)
                            {
                                sumString += ", " + value;
                            }
                            else
                            {
                                sumString = value;
                            }
                            break;
                    }
                }
                switch (type)
                {
                    case ReportingFieldTypes.DECIMAL:
                        return ReportingFieldUtil.formatValue(sumDecimal.ToString(), type, field);
                    case ReportingFieldTypes.INTEGER:
                        return ReportingFieldUtil.formatValue(sumDecimal.ToString(), type);
                    default:
                        return sumString;
                }
            }
            catch (Exception) { };
            return "<error>";
        }

        public static void setContentControlImage(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, BrowserDialog browserDialog)
        {
            string type = null;
            string link = null;
            string url = null;

            if (browserDialog == null)
            {
                return;
            }
            try { type = entity["$type"].ToString(); }
            catch (Exception) { }
            try { link = entity["$link"].ToString(); }
            catch (Exception) { }
            try { url = ((Dictionary<String, object>)entity["$value"])["$url"].ToString(); }
            catch (Exception) { }

            bool imageWasSet = false;
            if (ctrl.Type == WdContentControlType.wdContentControlPicture)
            {
                try
                {

                    string imageFile = null;
                    if (url != null)
                    {
                        imageFile = TemplateUtils.downloadImage(url, browserDialog);
                    }
                    if (imageFile != null && !"".Equals(imageFile))
                    {

                        float width = -1;
                        float height = -1;

                        if (ctrl.Range.InlineShapes.Count > 0)
                        {
                            width = ctrl.Range.InlineShapes[1].Width;
                            height = ctrl.Range.InlineShapes[1].Height;
                            ctrl.Range.InlineShapes[1].Delete();
                        }

                        doc.InlineShapes.AddPicture(imageFile, false, true, ctrl.Range);
                        imageWasSet = true;
                        if (ctrl.Range.InlineShapes.Count > 0 && width > 0 && height > 0)
                        {
                            InlineShape shape = ctrl.Range.InlineShapes[1];
                            // Image should be displayed in original size but not greater than 16 cm
                            float scal = 100;
                            shape.ScaleHeight = scal;
                            shape.ScaleWidth = scal;
                            // maxWith = 160mm
                            // Millimeter 2 Inch = 25.4
                            // Inch 2 Pixel = 72
                            float maxWidth = 454;  // 160 / 25.4 * 72
                            if (ti.display != null)
                            {
                                maxWidth = TemplateUtils.getMaxWidth(ti.display);
                                if (maxWidth <= 0)
                                {
                                    maxWidth = 454;
                                }
                            }

                            if (shape.Width > maxWidth)
                            {
                                scal = 100 * maxWidth / shape.Width;
                                shape.ScaleHeight = scal;
                                shape.ScaleWidth = scal;
                            }
                        }
                        addLinkToContentControl(doc, ctrl, entity);
                        File.Delete(imageFile);
                    }
                    if (!imageWasSet)
                    {
                        if (ctrl.Range.InlineShapes.Count > 0)
                        {
                            ctrl.Range.InlineShapes[1].Delete();
                        }
                        doc.InlineShapes.AddPicture(TemplateUtils.getTransparentImage(), false, true, ctrl.Range);
                    }
                }
                catch (Exception) { };
            }
        }

        private static void addLinkToContentControl(Document doc, ContentControl c, Dictionary<String, object> entity)
        {
            string link = null;
            try {
                if (entity.ContainsKey("$link"))
                {
                    link = entity["$link"].ToString();
                }
            }
            catch (Exception) { }

            if (link == null)
            {
                return;
            }
            Range r = c.Range;
            String tag;
            String title;
            WdContentControlType type = c.Type;
            tag = c.Tag;
            title = c.Title;
            //try
            //{
            //    while (r.Hyperlinks.Count > 0) r.Hyperlinks[1].Delete();
            //    c.Delete();
            //}
            //catch (Exception) { };
            //try
            //{
            //    //Hyperlink l = r.Hyperlinks.Add(r, link);
            //    c = doc.ContentControls.Add(type, r);
            //    c.Tag = tag;
            //    c.Title = title;
            //}
            //catch (Exception e) {
            //    MessageBox.Show(e.Message);
            //};
        }

        private static Dictionary<int, bool?> _ccDictionary = new Dictionary<int, bool?>();
        public static void clearContentControlStatus()
        {
            _ccDictionary.Clear();
        }
        public static bool isSingleContentControlCell(Cell cell)
        {
            return cell.Range.ContentControls.Count == 1;
        }

        public static bool isDirectContentControlType(Cell cell)
        {
            if (_ccDictionary.ContainsKey(cell.ColumnIndex) == false)
            {
                ContentControl cc = cell.Range.ContentControls[1];
                _ccDictionary[cell.ColumnIndex] = cc.Type == WdContentControlType.wdContentControlText && !(String.IsNullOrEmpty(cc.Range.Text) == false && cc.Range.Text.Contains("DISPLAYBARCODE"));
            }
            return (bool)_ccDictionary[cell.ColumnIndex];
        }
    }
}
