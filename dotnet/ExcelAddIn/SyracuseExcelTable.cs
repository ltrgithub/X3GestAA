using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;
using System.Resources;

namespace ExcelAddIn
{
    public class ExcelTablePrototypeField
    {
        public String _name;
        public String _title;
        public String _type;

        public String GetTitle() { return ((_title != null) && (_title != "")) ? _title : _name; }
        public object Parse(object value)
        {
            switch (_type)
            {
                case "application/x-date":
                case "application/x-datetime":
                case "application/x-time":
                    return DateTime.Parse((String)value);
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
        ResourceManager _locRes = new ResourceManager("ExcelAddIn.Messages", typeof(ThisAddIn).Assembly);

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
                if ((lo != null) && (lo.Name != _name))
                {
                    if (MessageBox.Show(String.Format(_locRes.GetString("OverrideTableConfirm"), activeCell.Address, lo.Name), _locRes.GetString("AddinTitle"), MessageBoxButtons.YesNo) == DialogResult.Yes)
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
            //
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
                MessageBox.Show(String.Format("Cannot resize a table with {0} columns and {1} rows. Please check Your insert preferences.\n(Error was: \"{2}\")",
                    activeListObject.ListColumns.Count, tableLength, e.Message));
                return false;
            }
            return true;
        }
        private Boolean _makePlace(Worksheet targetWorksheet, int initialRow, int initialCol, int colCount, int rowCount)
        {
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
                        MessageBox.Show(String.Format(_locRes.GetString("InsertCellsError"), colCount, rowCount, e.Message, "\n"));
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
                            MessageBox.Show(String.Format(_locRes.GetString("InsertRowsError"), rowCount, e.Message, "\n"));
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
                            MessageBox.Show(String.Format(_locRes.GetString("DeleteCellsError"), colCount, -rowCount, e.Message, "\n"));
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
                                MessageBox.Show(String.Format(_locRes.GetString("DeleteCellsError"), colCount, -rowCount, e.Message, "\n"));
                                toShift.Value2 = "";
                            }
                        }
                        else
                        {
                            // just empty values
                            Range toShift = targetWorksheet.Range[targetWorksheet.Cells[initialRow + rowCount, initialCol],
                                targetWorksheet.Cells[initialRow, initialCol + colCount - 1]];
                            toShift.Value2 = "";
                        }
                }
            return true;
        }
        private ListObject _createListObject(Range activeCell, ExcelTablePrototypeField[] headers, Dictionary<string, Range> actualColumnRanges, int rowCount)
        {
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
                MessageBox.Show(String.Format(_locRes.GetString("CreateTableError"), headers.Length, rowCount, e.Message, "\n"));
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
        public bool ResizeTable(int linesCount)
        {
            if (_listObject == null) return false;
            if (linesCount == 0) linesCount = 1;
            var saveScreenUpd = Globals.ThisAddIn.Application.ScreenUpdating;
            Globals.ThisAddIn.Application.ScreenUpdating = false;
            try
            {
                //
                Range activeCell = _listObject.Range[1, 1];
                Worksheet activeWorksheet = activeCell.Worksheet;
                //
                //_columnRanges = new Dictionary<string, Range>();
                // detect actual listobjects
/*                ListObject activeListObject = FindListObject(_name);
                if (activeListObject != null)
                {
                    ((Range)activeListObject.Range.Item[1, 1]).Select();
                    activeCell = ((Range)activeListObject.Range.Item[1, 1]);
                }
                else
                {
                    activeListObject = activeCell.ListObject;
                    // check if same dataset
                    if ((activeListObject != null) && (activeListObject.Name != _name))
                    {
                        if (MessageBox.Show(String.Format(_locRes.GetString("OverrideTableConfirm"), activeCell.Address, activeListObject.Name), _locRes.GetString("AddinTitle"), MessageBoxButtons.YesNo) == DialogResult.Yes)
                        {
                            ((Range)activeListObject.Range.Item[1, 1]).Select();
                            _deleteTable(activeListObject, true);
                            activeListObject = null;
                        }
                        else
                            return false;
                    }
                }
                //
                if (activeListObject == null)
                {
                    activeListObject = _createListObject(activeCell, _fields, _columnRanges, linesCount);
                    if (activeListObject == null)
                        return false;
                }
                else
                {
                    if (!_updateListObject(activeCell, activeWorksheet, activeListObject, _columnRanges, linesCount))
                        return false;
                }
 */
                if (!_updateListObject(activeCell, activeWorksheet, _listObject, _columnRanges, linesCount))
                    return false;
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

        public bool UpdateTable(object[] data, int startLine)
        {
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
                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    object[,] _colData = new object[resources.Length, 1];
                    _data.Add(namedRange.Key, _colData);
                }
                for (int r = 0; r < resources.Length; r++)
                {
                    object[] res = (object[])resources[r];
                    for (int col = 0; col < _fields.Length; col++)
                    {
                        String fieldName = _fields[col]._name;
                        if ((_columnRanges.ContainsKey(fieldName)) && (res[col] != null))
                        {
                            if (res[col].GetType().IsArray)
                            {
                                object fieldValue = _fields[col].Parse(((object[])res[col])[0]);
                                _data[fieldName][r, 0] = fieldValue;
                                Hyperlink link = (Hyperlink)activeWorksheet.Hyperlinks.Add(_columnRanges[fieldName].Item[r + startLine + 1, 1],
                                    (String)((object[])res[col])[1], "", Type.Missing, fieldValue);
                            }
                            else
                            {
                                _data[fieldName][r, 0] = _fields[col].Parse(res[col]);
                            }
                        }
                    }
                }
                foreach (KeyValuePair<string, Range> namedRange in _columnRanges)
                {
                    int startRow = namedRange.Value.Row + startLine;
                    activeWorksheet.Range[activeWorksheet.Cells[startRow, namedRange.Value.Column],
                        activeWorksheet.Cells[startRow + resources.Length - 1, namedRange.Value.Column]].Value = _data[namedRange.Key];
                }
                //
                return true;
            }
            finally
            {
                Globals.ThisAddIn.Application.ScreenUpdating = saveScreenUpd;
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
