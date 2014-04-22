using System;
using System.Collections.Generic;
using Microsoft.Office.Interop.Excel;
using Office = Microsoft.Office.Core;
using System.Web.Script.Serialization;
using Path = System.IO.Path;
using VB = Microsoft.Vbe.Interop;
using System.Windows.Forms;
using System.Linq;

namespace ExcelAddIn
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class UserDefinedFunctions
    {
        public UserDefinedFunctions() { }
        public object InvokeFunction(String functionName, object args)
        {
            try
            {
                Array locArgs = (Array)args;
                object[] jsArgs = new object[locArgs.Length + 1];
                jsArgs[0] = functionName;
                locArgs.CopyTo(jsArgs, 1);
                return Globals.ThisAddIn.ActionPanel.webDocument.InvokeScript("invokeUDF", jsArgs);
            }
            catch (Exception e)
            {
                return e.Message;
            }
        }
    }

    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class External
    {
        JsConsole _console = new JsConsole();
        Dictionary<String, SyracuseExcelTable> tableHelpers = new Dictionary<String, SyracuseExcelTable>();
        JavaScriptSerializer jsSerializer = new JavaScriptSerializer();

        public External() { }
        public Microsoft.Office.Interop.Excel.Application Application { get { return Globals.ThisAddIn.Application; } }
        public JsConsole Console { get { return _console; } }
        // enums
        public object vbext_ct_StdModule { get { return VB.vbext_ComponentType.vbext_ct_StdModule; } }
        public object msoString { get { return Office.MsoDocProperties.msoPropertyTypeString; } }
        public object ShiftDir_xlShiftToRight { get { return XlInsertShiftDirection.xlShiftToRight; } }
        public object ShiftDir_xlShiftDown { get { return XlInsertShiftDirection.xlShiftDown; } }
        public object ShiftOrg_fromLeftOrAbove { get { return XlInsertFormatOrigin.xlFormatFromLeftOrAbove; } }
        public object Missing { get { return Type.Missing; } }
        //
        public bool Aborted { get { return Globals.ThisAddIn.Aborted; } set { Globals.ThisAddIn.Aborted = value; }}
        public void StartUpdateTable()
        {
            Aborted = false;
            Globals.ThisAddIn.ShowProgressForm(true);
            Globals.ThisAddIn.Application.ScreenUpdating = false;
        }
        public void EndUpdateTable()
        {
            Globals.ThisAddIn.Application.ScreenUpdating = true;
            Globals.ThisAddIn.ShowProgressForm(false);
        }
        public bool UpdateTable(String name, String simplePrototype, String data, int startLine)
        {
            var dataArray = (object[])jsSerializer.DeserializeObject(data);
            Globals.ThisAddIn.UpdateProgress(startLine + dataArray.Length);

            if (new TemplateActions(null).isExcelTemplateType(Globals.ThisAddIn.Application.ActiveWorkbook))
            {
                /*
                 * If we have placeholders, we may have multiple tables and therefore multiple list objects.
                 */
                var orderedPlaceholderTableList = ReportingUtils.buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
                if (orderedPlaceholderTableList.Count > 0)
                {
                    foreach (IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable in orderedPlaceholderTableList)
                    {
                        tableHelpers[name].UpdateTable(dataArray, startLine, placeholderTable);
                    }
                    return true;
                }
            }

            return tableHelpers[name].UpdateTable(dataArray, startLine);
        }
        public bool ResizeTable(String name, String simplePrototype, int linesCount, string cellAddress = "")
        {
            // resolve cell address
            Range target = null;
            if (cellAddress != "")
                target = Globals.ThisAddIn.Application.Range[cellAddress];
            SyracuseExcelTable table = new SyracuseExcelTable(name, (ExcelTablePrototypeField[])jsSerializer.Deserialize<ExcelTablePrototypeField[]>(simplePrototype), target);
            if (tableHelpers.ContainsKey(name))
                tableHelpers[name] = table;
            else
                tableHelpers.Add(name, table);
            table = tableHelpers[name];

            var orderedPlaceholderTableList = ReportingUtils.buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
            if (orderedPlaceholderTableList.Count > 0)
            {
                foreach (IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable in orderedPlaceholderTableList)
                {
                    table.ResizeTable(linesCount, placeholderTable.First().placeholder.name);
                }
                return true;
            }
  
            return table.ResizeTable(linesCount);
        }
        public bool DeleteTable(String name)
        {
            SyracuseExcelTable table = new SyracuseExcelTable(name, null);
            return table.DeleteTable(name);
        }
        //
        public void RegisterVBCallback()
        {
            // register UDF callbacks
            Globals.ThisAddIn.Application.Run("RegisterCallback", new UserDefinedFunctions(),
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing, Type.Missing,
                Type.Missing, Type.Missing);
        }
        public void RegisterMacroOptions(String udfName, String udfDescription, String udfCategory, String argOptions)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            String[] argHelp = ser.Deserialize<String[]>(argOptions);
            // Macro options
            Globals.ThisAddIn.Application.MacroOptions2(udfName, udfDescription, Type.Missing, Type.Missing, false, Type.Missing,
                udfCategory, Type.Missing, Type.Missing, Type.Missing,
                argHelp);
        }
        public String GetActiveWorkbookCustomProperties()
        {
            Office.DocumentProperties props = (Office.DocumentProperties)Globals.ThisAddIn.Application.ActiveWorkbook.CustomDocumentProperties;
            Dictionary<string, string> result = new Dictionary<String, String>();
            foreach (Office.DocumentProperty prop in props)
            {
                result[prop.Name] = (string)prop.Value;
            }
            JavaScriptSerializer ser = new JavaScriptSerializer();
            return ser.Serialize(result);
        }
        public void StoreCustomData(String address, String data)
        {
            (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).StoreCustomDataAtAddress(address, data);
        }
        public String GetCustomData(String address)
        {
            return (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).GetCustomDataByAddress(address);
        }
        public String GetDocumentContent()
        {
            String tempFileName = Path.GetTempFileName();
            Globals.ThisAddIn.Application.ActiveWorkbook.SaveCopyAs(tempFileName);
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);
            return Convert.ToBase64String(content);
        }
        public void DocumentSaved()
        {
            Globals.ThisAddIn.Application.ActiveWorkbook.Saved = true;
            Globals.ThisAddIn.Ribbon.buttonSave.Enabled = false;
            CommonUtils.ShowInfoMessage(global::ExcelAddIn.Properties.Resources.MSG_SAVE_DOC_DONE, global::ExcelAddIn.Properties.Resources.MSG_SAVE_DOC_DONE_TITLE);
        }
        public System.Action onLogonHandler = null;
        public void onLogon()
        {
            if (onLogonHandler != null)
                onLogonHandler();
        }

        public delegate void TablesLoadedCallback(string errorMessage);
        public TablesLoadedCallback onTablesLoadedHandler = null;
        public void onTablesLoaded(string errorMessage = "")
        {
            if (onTablesLoadedHandler != null)
                onTablesLoadedHandler(errorMessage);
        }
        public delegate void SelectRecordCallback(string prototype, string dataset);
        public SelectRecordCallback onSelectRecordHandler = null;
        public void onselectRecord(string prototype, string dataset)
        {
            if (onSelectRecordHandler != null)
                onSelectRecordHandler(prototype, dataset);
        }
        //
        public void ShowSettingsForm()
        {
            Globals.ThisAddIn.ShowSettingsForm();
        }
        public void SelectionChanged()
        {
            Globals.ThisAddIn.ActionPanel.onSelectionChange();
        }
        // check version
        public String GetAddinVersion()
        {
            return Globals.ThisAddIn.getInstalledAddinVersion();
        }

        public String getSyracuseRole()
        {
            String syracuseRole = (new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook)).GetCustomDataByName("syracuseRole");
            if (syracuseRole.Equals(String.Empty))
            {
                Workbook wb = Globals.ThisAddIn.Application.ActiveWorkbook;
                if (wb != null)
                {
                    SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(wb); 
                    if (customData != null)
                        syracuseRole = customData.getSyracuseRole();
                }
            }
            return syracuseRole;
        }

        // needed version (from JS)
        public void expectedVersion(String neededVersion)
        {
            string[] needed = neededVersion.Split('.');
            int neddedBinary = (Convert.ToInt32(needed[0]) << 24);
            neddedBinary += (Convert.ToInt32(needed[1]) << 16);
            neddedBinary += Convert.ToInt32(needed[2]);

            if (neddedBinary > Globals.ThisAddIn.versionNumberBinary)
            {
                if (Globals.ThisAddIn.newVersionMessage == false)
                {
                    DialogResult result = MessageBox.Show(new Form() { TopMost = true }, global::ExcelAddIn.Properties.Resources.MSG_NEW_VERSION, global::ExcelAddIn.Properties.Resources.MSG_NEW_VERSION_TITLE, MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1);
                    Globals.ThisAddIn.newVersionMessage = true;
                    if (result == DialogResult.Yes)
                    {
                        ActionPanel actionPanel = new ActionPanel();
                        actionPanel.updateAddin();
                    }
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonUpdate.Enabled = true;
                    }
                }
            }
        }
    }

    public class JsConsole
    {
        public void log(object obj)
        {
            Console.WriteLine(obj);
        }

        public void error(object obj)
        {
            Console.WriteLine(obj);
        }
    }

}
