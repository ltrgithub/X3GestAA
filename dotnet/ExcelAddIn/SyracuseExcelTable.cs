using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Globalization;
 
namespace ExcelAddIn
{
    public class ExcelTablePrototypeField
    {
        public String _name;
        public String _title;
        public String _type;
        public int? _scale;

        public static CultureInfo decimalFormat = CultureInfo.CreateSpecificCulture("en-US");

        public String GetTitle() { return ((_title != null) && (_title != "")) ? _title : _name; }
        public object Parse(object value)
        {
            switch (_type)
            {
                case "application/x-date":
                case "application/x-datetime":
                case "application/x-time":
                    if (value.Equals("0000-00-00") || value.Equals("")) // convergence client may send dates like this
                        return "";
                    return DateTime.Parse((String)value);
                case "application/x-decimal":
                    if (value.Equals("")) 
                        return "";
                    if (value is String)
                    {
                        return Decimal.Parse((String)value, decimalFormat);
                    }
                    return value;
                default:
                    return value;
            }
        }
    }
    class SyracuseExcelTable
    {
        ExcelTablePrototypeField[] _fields;
        String _name;
        ListObject _listObject;
        Dictionary<string, Range> _columnRanges;
        public SyracuseExcelTable(String name, ExcelTablePrototypeField[] fields, Range cell = null)
        {
            _name = name;
            _fields = fields;
            _columnRanges = new Dictionary<string, Range>();
            _listObject = FindListObject(name);
            if (_listObject == null)
            {
                // initialize the list object to required cell or the active one
                Range activeCell = cell;
                if (activeCell == null)
                    activeCell = Globals.ThisAddIn.Application.ActiveCell;
                ListObject lo = activeCell.ListObject;
                // check if same dataset
                if ((lo != null) && (lo.Name != _name) && new TemplateActions(null).isExcelTemplateType(Globals.ThisAddIn.Application.ActiveWorkbook) == false)
                {
                    if (MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.OverrideTableConfirm, activeCell.Address, lo.Name), global::ExcelAddIn.Properties.Resources.AddinTitle, MessageBoxButtons.YesNo) == DialogResult.Yes)
                    {
                        ((Range)lo.Range.Item[1, 1]).Select();
                        _deleteTable(lo, true);
                        _listObject = _createListObject(activeCell, _fields, _columnRanges, 1);
                    }
                    // !! if user says "No", _listObject must remain null
                } else
                    _listObject = _createListObject(activeCell, _fields, _columnRanges, 1);
            }
        }

        public SyracuseExcelTable()
        {
        }

        private Dictionary<string, Range> _detectColumnRanges(Range cell, String actualDatasource)
        {
            Range activeCell = cell;
            Worksheet activeWorksheet = activeCell.Worksheet;
            // detect column ranges
            Dictionary<string, Range> actualColumnRanges = null;
            if (actualDatasource != "")
            {
                actualColumnRanges = new Dictionary<string, Range>();
                foreach (Name namedRange in activeWorksheet.Names)
                {
                    String prefix = activeWorksheet.Name + "!" + actualDatasource + ".";
                    if ((namedRange.Name != prefix) && (namedRange.Name.IndexOf(prefix) == 0))
                    {
                        String colName = namedRange.Name.Substring(prefix.Length);
                        if (colName != "")
                            try
                            {
                                actualColumnRanges.Add(colName, namedRange.RefersToRange);
                            }
                            catch
                            {
                                // do nothing, possibly invalid range so we'll ignore
                            }
                    }
                }
            }
            return actualColumnRanges;
        }

        private Boolean _resizeListObject(Worksheet activeWorksheet, ListObject activeListObject, int tableLength, bool includeTotal)
        {
            Range topLeft = (Range)(activeListObject.ShowHeaders ?
                activeWorksheet.Cells[activeListObject.HeaderRowRange.Row, activeListObject.HeaderRowRange.Column] :
                activeWorksheet.Cells[activeListObject.DataBodyRange.Row, activeListObject.DataBodyRange.Column]);
            try
            {
                // for some reason (???) one must include the total lines when extending the list but not when retracting !!!
                activeListObject.Resize(activeWorksheet.Range[topLeft,
                    activeWorksheet.Cells[activeListObject.DataBodyRange.Row + tableLength +
                    (includeTotal && activeListObject.ShowTotals ? activeListObject.TotalsRowRange.Rows.Count : 0) - 1,
                    activeListObject.DataBodyRange.Column + activeListObject.ListColumns.Count - 1]]);
            }
            catch (Exception e)
            {
                MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.ResizeTableError,
                    activeListObject.ListColumns.Count, tableLength, e.Message));
                return false;
            }
            return true;
        }

        private Boolean _makePlace(Worksheet targetWorksheet, int initialRow, int initialCol, int colCount, int rowCount)
        {
            if (new TemplateActions(null).isExcelTemplateType(Globals.ThisAddIn.Application.ActiveWorkbook))
                return true;

            if (rowCount > 0)
            {
                if (Globals.ThisAddIn.GetCellsInsertStyle() == CellsInsertStyle.ShiftCells)
                {
                    Range toShift = targetWorksheet.Range[targetWorksheet.Cells[initialRow, initialCol],
                        targetWorksheet.Cells[initialRow + rowCount - 1, initialCol + colCount - 1]];
                    try
                    {
                        toShift.Insert(XlInsertShiftDirection.xlShiftDown);
                    }
                    catch (Exception e)
                    {
                        // insert error
                        MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.InsertCellsError, colCount, rowCount, e.Message, "\n"));
                        return false;
                    }
                }
                else
                    if (Globals.ThisAddIn.GetCellsInsertStyle() == CellsInsertStyle.InsertRows)
                    {
                        Range toShift = (Range)targetWorksheet.Rows[String.Format("{0}:{1}", initialRow, (initialRow + rowCount - 1))];
                        try
                        {
                            toShift.Insert(XlInsertShiftDirection.xlShiftDown);
                        }
                        catch (Exception e)
                        {
                            // insert error
                            MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.InsertRowsError, rowCount, e.Message, "\n"));
                            return false;
                        }
                    }
            }
            else
                if(rowCount < 0)
                {
                    if (Globals.ThisAddIn.GetCellsDeleteStyle() == CellsDeleteStyle.ShiftCells)
                    {
                        Range toShift = targetWorksheet.Range[targetWorksheet.Cells[initialRow, initialCol],
                            targetWorksheet.Cells[initialRow - rowCount - 1, initialCol + colCount - 1]];
                        try
                        {
                            toShift.Delete(XlDeleteShiftDirection.xlShiftUp);
                        }
                        catch (Exception e)
                        {
                            // delete error
                            MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.DeleteCellsError, colCount, -rowCount, e.Message, "\n"));
                            toShift.Value2 = "";
                        }
                    }
                    else
                        if (Globals.ThisAddIn.GetCellsDeleteStyle() == CellsDeleteStyle.DeleteRows)
                        {
                            Range toShift = (Range)targetWorksheet.Rows[String.Format("{0}:{1}", initialRow, (initialRow - rowCount - 1))];
                            try
                            {
                                toShift.Delete(XlDeleteShiftDirection.xlShiftUp);
                            }
                            catch (Exception e)
                            {
                                // delete error
                                MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.DeleteCellsError, colCount, -rowCount, e.Message, "\n"));
                                toShift.Value2 = "";
                            }
                        }
                        else
                        {
                            // just empty values
                            Range toShift = targetWorksheet.Range[targetWorksheet.Cells[initialRow - rowCount, initialCol],
                                targetWorksheet.Cells[initialRow, initialCol + colCount - 1]];
                            toShift.Value2 = "";
                        }
                }
            return true;
        }

        public ListObject createDiscreteTemplateObject(String listObjectName, IGrouping<Object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable, int rowCount)
        {
            Range activeCell = Globals.ThisAddIn.Application.ActiveCell;

            List<ExcelTablePrototypeField> headers = new List<ExcelTablePrototypeField>();

            foreach (ExcelAddIn.ReportingUtils.PlaceholderTable item in placeholderTable)
            {
                    ExcelTablePrototypeField prototypeField = new ExcelTablePrototypeField();
                    prototypeField._name = item.placeholder.name;
                    prototypeField._title = item.placeholder.title;
                    headers.Add(prototypeField);
            }

            return _createTemplateListObject(listObjectName, activeCell, placeholderTable, headers.ToArray(), null, rowCount);
        }

        private ListObject _createTemplateListObject(Range activeCell, ExcelTablePrototypeField[] headers, Dictionary<string, Range> actualColumnRanges, int rowCount, ListObject listObject = null)
        {
            var orderedPlaceholderTableList = ReportingUtils.buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
            if (orderedPlaceholderTableList.Count == 0)
            {
                return null;
            }

            ListObject lastListObject = null;
            foreach (IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable in orderedPlaceholderTableList)
            {
                /*
                 * Get the name of the first placeholder in the group...
                 */
                String listObjectName = placeholderTable.First().placeholder.name;

                if (lastListObject == null)
                    lastListObject = _createTemplateListObject(listObjectName, activeCell, placeholderTable, headers, actualColumnRanges, rowCount);
                else
                    _createTemplateListObject(listObjectName, activeCell, placeholderTable, headers, actualColumnRanges, rowCount);
            }
            return lastListObject;
        }

        private ListObject _createTemplateListObject(String listObjectName, Range activeCell, IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable, 
                                    ExcelTablePrototypeField[] headers, Dictionary<string, Range> actualColumnRanges, int rowCount, ListObject listObject = null)
        {
            ListObject resultListObject = null;
            Worksheet targetWorksheet = activeCell.Worksheet;

            var firstPlaceholder = placeholderTable.First().placeholder;
            int initialRow = firstPlaceholder.row, initialColumn = firstPlaceholder.column;
            int columnCount = placeholderTable.Count();

            if (listObject == null && !_makePlace(targetWorksheet, initialRow, initialColumn, columnCount, rowCount))
                return null;

            if (actualColumnRanges != null)
            {
                for (int i = 0; i < headers.Length; i++)
                {
                    if (placeholderTable.Where(item => item.placeholder.name == headers[i]._name).Count() > 0)
                    {
                        int placeholderColumn = placeholderTable.Where(item => item.placeholder.name == headers[i]._name).First().placeholder.column;

                        Range cells = targetWorksheet.Range[targetWorksheet.Cells[initialRow + 1, placeholderColumn],
                                targetWorksheet.Cells[initialRow + rowCount, placeholderColumn]];

                        actualColumnRanges.Add(headers[i]._name, cells);
                    }
                }
            }

            int tableEndColumn = placeholderTable.Last().placeholder.column;

            try
            {
                resultListObject = targetWorksheet.ListObjects.Add(XlListObjectSourceType.xlSrcRange,
                                        targetWorksheet.Range[
                                            targetWorksheet.Cells[initialRow, initialColumn],
                                            targetWorksheet.Cells[initialRow + 1, tableEndColumn]],
                                        Type.Missing, XlYesNoGuess.xlYes, Type.Missing);
            }
            catch { return null; }

            resultListObject.Name = listObjectName;

            if (resultListObject.ShowHeaders)
            {
                for (int i = 0; i < headers.Length; i++)
                {
                    if (placeholderTable.Where(item => item.placeholder.name == headers[i]._name).ToList().Count > 0)
                    {
                        int headerColumn = placeholderTable.Where(item => item.placeholder.name == headers[i]._name).First().placeholder.column;
                        ((Range)resultListObject.HeaderRowRange.Item[1, headerColumn - firstPlaceholder.column + 1]).Value2 = headers[i].GetTitle();
                    }
                }
            }

            return resultListObject;
        }
        
        private ListObject _createListObject(Range activeCell, ExcelTablePrototypeField[] headers, Dictionary<string, Range> actualColumnRanges, int rowCount)
        {
            if (new TemplateActions(null).isExcelTemplateType(Globals.ThisAddIn.Application.ActiveWorkbook))
                return _createTemplateListObject(activeCell, headers, actualColumnRanges, rowCount);

            ListObject resultListObject = null;
            Worksheet targetWorksheet = activeCell.Worksheet;
            //
            int initialRow = activeCell.Row, initialCol = activeCell.Column;
            // make place for the table
            if (!_makePlace(targetWorksheet, initialRow, initialCol, headers.Length, rowCount))
                return null;
            // make new column ranges, wo header line !!
            for (int i = 0; i < headers.Length; i++)
            {
                // reselect initial range (wo header line)
                Range cells = targetWorksheet.Range[targetWorksheet.Cells[initialRow + 1, initialCol + i],
                    targetWorksheet.Cells[initialRow + rowCount, initialCol + i]];
                actualColumnRanges.Add(headers[i]._name, cells);
            }
            // the table must be created after cells shift
            try
            {
                resultListObject = targetWorksheet.ListObjects.Add(XlListObjectSourceType.xlSrcRange,
                    targetWorksheet.Range[
                    targetWorksheet.Cells[initialRow, initialCol],
                    targetWorksheet.Cells[initialRow + rowCount, initialCol + headers.Length - 1]],
                    Type.Missing, XlYesNoGuess.xlYes, Type.Missing);
            }
            catch (Exception e)
            {
                MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.CreateTableError, headers.Length, rowCount, e.Message, "\n"));
                return null;
            }
            resultListObject.Name = _name;
            // headers
            if (resultListObject.ShowHeaders)
            {
                for (int i = 0; i < headers.Length; i++)
                {
                    ((Range)resultListObject.HeaderRowRange.Item[1, i + 1]).Value2 = headers[i].GetTitle();
                }
            }
            return resultListObject;
        }
        private Boolean _updateListObject(Range cell, Worksheet activeWorksheet, ListObject activeListObject, Dictionary<string, Range> actualColumnRanges, int rowCount)
        {
            // ignoring header and total row
            int headerRowCount = activeListObject.ShowHeaders ? 1 : 0;
            int totalRowCount = activeListObject.ShowTotals ? activeListObject.TotalsRowRange.Rows.Count : 0;
            int actualRowCount = activeListObject.ListRows.Count;
            // resize
            int diff = rowCount - actualRowCount;
            if (diff != 0)
            {
                if (diff > 0)
                {
                    // make place: insert cells/rows starting with tables last line
                    if (!_makePlace(activeWorksheet, activeListObject.DataBodyRange.Row + actualRowCount + totalRowCount, activeListObject.DataBodyRange.Column, activeListObject.ListColumns.Count, diff))
                        return false;
                    // resize
                    if (!_resizeListObject(activeWorksheet, activeListObject, rowCount, true)) 
                        return false;
                }
                else
                    if (diff < 0)
                    {
                        // resize table
                        var showTotals = activeListObject.ShowTotals;
                        activeListObject.ShowTotals = false;
                        _resizeListObject(activeWorksheet, activeListObject, rowCount, false);
                        // shift
                        _makePlace(activeWorksheet, activeListObject.DataBodyRange.Row + activeListObject.ListRows.Count/* + totalRowCount*/, activeListObject.DataBodyRange.Column,
                            activeListObject.ListColumns.Count, diff);
//                        cells.Delete(XlDeleteShiftDirection.xlShiftUp);
                        activeListObject.ShowTotals = showTotals;
                    }
            }
            // data ranges
            // vertical resize ranges
            int dataBodyRow = activeListObject.DataBodyRange.Row;
            Dictionary<string, Range> oldColumnRanges = _detectColumnRanges(cell, activeListObject.Name);
            // vertical resize ranges
            if (oldColumnRanges.Count != 0)
            {
                actualColumnRanges.Clear();
                foreach (KeyValuePair<string, Range> namedRange in oldColumnRanges)
                {
                    // update map
                    actualColumnRanges.Add(namedRange.Key,
                        activeWorksheet.Range[activeWorksheet.Cells[dataBodyRow, namedRange.Value.Column],
                        activeWorksheet.Cells[dataBodyRow + rowCount - 1, namedRange.Value.Column]]);
                }
            }
            else
            {
                List<String> keys = new List<String>(actualColumnRanges.Keys);
                foreach (String k in keys)
                {
                    // update map
                    actualColumnRanges[k] =
                        activeWorksheet.Range[activeWorksheet.Cells[dataBodyRow, actualColumnRanges[k].Column],
                        activeWorksheet.Cells[dataBodyRow + rowCount - 1, actualColumnRanges[k].Column]];
                }
            }
            //
            return true;
        }
        private void _deleteTable(ListObject table, Boolean updateDocumentDatasources)
        {
            Globals.ThisAddIn.Application.ScreenUpdating = false;
            try
            {
                Worksheet ws = (Worksheet)Globals.ThisAddIn.Application.ActiveSheet;
                // delete column ranges
                foreach (Name namedRange in ws.Names)
                {
                    String prefix = ws.Name + "!" + table.Name + ".";
                    if ((namedRange.Name != prefix) && (namedRange.Name.IndexOf(prefix) == 0))
                    {
                        namedRange.Delete();
                    }
                }
                // delete table
                table.Delete();
                // notify
                if (updateDocumentDatasources)
                {
                    // modify datasources
                    // notify update
                }
            }
            finally
            {
                Globals.ThisAddIn.Application.ScreenUpdating = true;
            }
        }

        public ListObject FindListObject(String datasource)
        {
            foreach (Worksheet s in Globals.ThisAddIn.Application.ActiveWorkbook.Sheets)
                foreach (ListObject o in s.ListObjects)
                {
                    if (o.Name == datasource) return o;
                }
            return null;
        }

        public bool ResizeTable(int linesCount, String placeholderName)
        {
            _listObject = FindListObject(placeholderName);
            return ResizeTable(linesCount);
        }

        public bool ResizeTable(int linesCount)
        {
            bool cleanFirstDataRow = false;
            if (_listObject == null) return false;
            if (linesCount == 0)
            {
                linesCount = 1;
                cleanFirstDataRow = true;
            }
            var saveScreenUpd = Globals.ThisAddIn.Application.ScreenUpdating;
            Globals.ThisAddIn.Application.ScreenUpdating = false;
            try
            {
                //
                Range activeCell = _listObject.Range[1, 1];
                Worksheet activeWorksheet = activeCell.Worksheet;
                //
                if (!_updateListObject(activeCell, activeWorksheet, _listObject, _columnRanges, linesCount))
                    return false;
                if (cleanFirstDataRow == true)
                {
                    try
                    {
                        // A TableObject cannot be empty (have zero rows)
                        // If the resultset is empty, at least clear the data in the last remaining row.
                        // Otherwise the first row of the last fetch will remain visible, which is wrong, especially when changing filters
                        _listObject.Range.Rows[2].ClearFormats();
                        _listObject.Range.Rows[2].Clear();
                    }
                    catch (Exception) { };
                }

                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    // make named ranges
                    activeWorksheet.Names.Add(_name + "." + namedRange.Key,
                        namedRange.Value,
                        true, Type.Missing, Type.Missing, Type.Missing, Type.Missing,
                        Type.Missing, Type.Missing, Type.Missing, Type.Missing);
                }
                return true; 
            }
            finally
            {
                Globals.ThisAddIn.Application.ScreenUpdating = saveScreenUpd;
            }
        }

        public bool UpdateTable(object[] data, int startLine, IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable = null)
        {
            if (placeholderTable != null)
                _listObject = FindListObject(placeholderTable.First().placeholder.name);

            if (_listObject == null) return false;
            var saveScreenUpd = Globals.ThisAddIn.Application.ScreenUpdating;
            Globals.ThisAddIn.Application.ScreenUpdating = false;
            try
            {
                //Range activeCell = cell;
                Range activeCell = _listObject.Range[1, 1];
                Worksheet activeWorksheet = activeCell.Worksheet;
                //
                object[] resources = data;
                //
                if(ResizeTable(startLine + resources.Length) == false)
                    return false;
                //
                Dictionary<string, object[,]> _data = new Dictionary<string, object[,]>();
                Dictionary<string, ExcelTablePrototypeField> _protoField = new Dictionary<string, ExcelTablePrototypeField>();
                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    if (placeholderTable != null && ReportingUtils.isPlaceholderInTable(placeholderTable, namedRange.Key) == false)
                        continue;

                    object[,] _colData = new object[resources.Length, 1];
                    _data.Add(namedRange.Key, _colData);
                }
                // empty all hyperlink in the range
                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    if (placeholderTable != null && ReportingUtils.isPlaceholderInTable(placeholderTable, namedRange.Key) == false)
                        continue;

                    int startRow = namedRange.Value.Row + startLine;
                    activeWorksheet.Range[activeWorksheet.Cells[startRow, namedRange.Value.Column],
                        activeWorksheet.Cells[startRow + resources.Length - 1, namedRange.Value.Column]].Clear();
                }
                // create data
                for (int r = 0; r < resources.Length; r++)
                {
                    object[] res = (object[])resources[r];
                    for (int col = 0; col < _fields.Length; col++)
                    {
                        String fieldName = _fields[col]._name;
                        if (placeholderTable != null && ReportingUtils.isPlaceholderInTable(placeholderTable, fieldName) == false) 
                            continue;

                        if ((_columnRanges.ContainsKey(fieldName)) && (res[col] != null))
                        {
                            if (res[col].GetType().IsArray)
                            {
                                object fieldValue = _fields[col].Parse(((object[])res[col])[0]);
                                _protoField[fieldName] = _fields[col];
                                if (fieldValue != null)
                                {
                                    _data[fieldName][r, 0] = fieldValue;
                                    Hyperlink link = (Hyperlink)activeWorksheet.Hyperlinks.Add(_columnRanges[fieldName].Item[r + startLine + 1, 1],
                                        (String)((object[])res[col])[1], "", Type.Missing, fieldValue);
                                }
                            }
                            else
                            {
                                _data[fieldName][r, 0] = _fields[col].Parse(res[col]);
                                _protoField[fieldName] = _fields[col];
                            }
                        }
                    }
                }
                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    if (placeholderTable != null && ReportingUtils.isPlaceholderInTable(placeholderTable, namedRange.Key) == false) 
                        continue;

                    int startRow = namedRange.Value.Row + startLine;
                    activeWorksheet.Range[activeWorksheet.Cells[startRow, namedRange.Value.Column],
                        activeWorksheet.Cells[startRow + resources.Length - 1, namedRange.Value.Column]].Value = _data[namedRange.Key];

                    // This should not be neccesarry, because excel changes the format of the cells to short date if a DateTime value is asigned to the cell,
                    // but on some PCs this is not working, so the format for type "date" is applied for safty
                    if (resources.Length > 0)
                    {
                        if (_protoField.ContainsKey(namedRange.Key) && _data.ContainsKey(namedRange.Key))
                        {
                            object colData = _data[namedRange.Key];
                            Range fmt = activeWorksheet.Range[activeWorksheet.Cells[startRow, namedRange.Value.Column], activeWorksheet.Cells[startRow + resources.Length - 1, namedRange.Value.Column]];
                            applyFormat(fmt, _protoField[namedRange.Key], colData);
                        }
                    }
                }
                //
                return true;
            }
            finally
            {
                Globals.ThisAddIn.Application.ScreenUpdating = saveScreenUpd;
            }
        }

        private void applyFormat(Range colRange, ExcelTablePrototypeField field, object colData)
        {
            switch (field._type)
            {
                case "application/x-date":
                case "application/x-datetime":
                case "application/x-time":
                    colRange.NumberFormat = "m/d/yyyy";
                    break;
                case "application/x-decimal":
                    string nf = "0.00";
                    try
                    {
                        int scale = field._scale.GetValueOrDefault(-1);
                        if (scale == 0)
                        {
                            nf = "0";
                        }
                        else if (scale >= 1 && scale <= 16)
                        {
                            nf = "0.0000000000000000".Substring(0, 2 + scale);
                        }
                        else if (scale == -1)
                        {
                            // not set
                            nf = "0.00##############";
                        }
                    }
                    catch (Exception) { }

                    colRange.NumberFormat = nf;
                    break;
                case "application/x-integer":
                    colRange.NumberFormat = "0";
                    break;
            }
        }
        public bool DeleteTable(String datasourceName, Boolean updateDocumentDatasources = false)
        {
            Worksheet activeWs = (Worksheet)Globals.ThisAddIn.Application.ActiveSheet;
            ListObject table = FindListObject(datasourceName);
            if (table != null)
                _deleteTable(table, updateDocumentDatasources);
            return true;
        }

    }
}
