using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;

namespace ExcelAddIn
{
    class SyracuseCustomData
    {
        String storeWorksheetName = "Sage.X3.ReservedSheet";
        Workbook thisWorkbook = null;
        public SyracuseCustomData(Workbook Wb)
        {
            thisWorkbook = Wb;
        }
        //
        private Dictionary<String, object> _GetDictionnary(Boolean withCreate = false)
        {
            // read dictionnary
            Worksheet reservedSheet = _GetReservedSheet(withCreate);
            if (reservedSheet != null)
            {
                Range dicCell = (Range)reservedSheet.Range["A1"];
                if (dicCell.Value2 != null)
                {
                    JavaScriptSerializer ser = new JavaScriptSerializer();
                    return (Dictionary<String, object>)ser.DeserializeObject((String)dicCell.Value2);
                }
                else
                    if(withCreate)
                    {
                        Dictionary<String, object> dic = new Dictionary<string, object>();
                        // make standard dictionnary; TODO: can we define this in javascript, after connection ?
	                    dic["dictionnaryAddress"] = "A1";
	                    dic["serverUrlAddress"] = "A2";
	                    dic["documentUrlAddress"] = "A3";
	                    dic["documentTitleAddress"] = "A4";
                        dic["datasourcesAddress"] = "A5";
                        // store it
                        JavaScriptSerializer ser = new JavaScriptSerializer();
                        StoreCustomDataAtAddress("A1", ser.Serialize(dic));
                        //
                        return dic;
                    }
            }
            return null;
        }
        public Worksheet GetReservedSheet(Boolean withCreate)
        {
            return _GetReservedSheet(withCreate);
        }
        private Worksheet _GetReservedSheet(Boolean withCreate)
        {
            // get store worksheet
            Worksheet x3StoreSheet = null;
            if (thisWorkbook == null) return null;
            foreach (Worksheet store in thisWorkbook.Worksheets)
            {
                if (store.Name == storeWorksheetName)
                {
                    x3StoreSheet = store;
                    break;
                }
            }
            if (withCreate && (x3StoreSheet == null))
            {
                Worksheet oldActive = (Worksheet)thisWorkbook.ActiveSheet;
                x3StoreSheet = (Worksheet)thisWorkbook.Worksheets.Add(Type.Missing, Type.Missing, 1, XlSheetType.xlWorksheet);
                x3StoreSheet.Name = storeWorksheetName;
                x3StoreSheet.Visible = XlSheetVisibility.xlSheetHidden;
                ((Microsoft.Office.Interop.Excel._Worksheet) oldActive).Activate();
            }
            return x3StoreSheet;
        }
        //
        public String GetCustomDataByAddress(String customDataAddress)
        {
            Worksheet reservedSheet = _GetReservedSheet(false);
            if (reservedSheet == null)
                return "";
            Range dicCell = (Range)reservedSheet.Range[customDataAddress];
            return (dicCell.Value2 != null) ? dicCell.Value2.ToString() : "";
        }
        public String GetCustomDataByName(String customDataName)
        {
            Dictionary<String, object> dic = _GetDictionnary();
            return ((dic != null) && dic.ContainsKey(customDataName)) ? GetCustomDataByAddress((String)dic[customDataName]) : "";
        }
        public void StoreCustomDataByName(String customDataName, String customDataValue)
        {
            Dictionary<String, object> dic = _GetDictionnary(true);
            if((dic != null) && (dic.ContainsKey(customDataName)))
                StoreCustomDataAtAddress((String)dic[customDataName], customDataValue);
        }
        public void StoreCustomDataAtAddress(String customDataAddress, String customDataValue)
        {
            Worksheet reservedSheet = _GetReservedSheet(true);
            //
            Range target = (Range)reservedSheet.Range[customDataAddress];
            target.Value2 = customDataValue;
        }
    }
}
