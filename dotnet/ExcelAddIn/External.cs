﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Excel;
using Office = Microsoft.Office.Core;
using System.Web.Script.Serialization;
using Path = System.IO.Path;
using VB = Microsoft.Vbe.Interop;
using System.Windows.Forms;

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
        }
        public void EndUpdateTable()
        {
            Globals.ThisAddIn.ShowProgressForm(false);
        }
        public bool UpdateTable(String name, String simplePrototype, String data, int startLine)
        {
            var dataArray = (object[])jsSerializer.DeserializeObject(data);
            Globals.ThisAddIn.UpdateProgress(startLine + dataArray.Length);
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
            (new SyracuseCustomData()).StoreCustomDataAtAddress(address, data);
        }
        public String GetCustomData(String address)
        {
            return (new SyracuseCustomData()).GetCustomDataByAddress(address);
        }
        public String GetDocumentContent()
        {
            String tempFileName = Path.GetTempFileName();
            Globals.ThisAddIn.Application.ActiveWorkbook.SaveCopyAs(tempFileName);
            //
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);
            // TODO delete temp file
            return Convert.ToBase64String(content);
        }
        public void DocumentSaved()
        {
            Globals.ThisAddIn.Application.ActiveWorkbook.Saved = true;
            //
            Globals.ThisAddIn.Ribbon.buttonPublish.Enabled = false;
        }
        public System.Action onLogonHandler = null;
        public void onLogon()
        {
            if (onLogonHandler != null)
                onLogonHandler();
        }
//        public System.Action onTablesLoadedHandler = null;
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
            return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
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
