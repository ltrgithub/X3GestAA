using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;

namespace WordAddIn
{
    public class TemplateUtils
    {
        private static CultureInfo decimalFormat = CultureInfo.CreateSpecificCulture("en-US");
        private static string transparentImageFile = null;

        public static string downloadImage(string url, BrowserDialog browserDialog)
        {
            string imageFile = null;
            try
            {
                // currenty, only syracuse sends protocol, host and port. Add this information for X3 entities
                if (!(url.StartsWith("http:") || url.StartsWith("https:")))
                {
                    url = browserDialog.serverUrl + url;
                }
                byte[] image = browserDialog.readBinaryURLContent(url);
                if (image != null)
                {
                    imageFile = Path.GetTempFileName();
                    using (FileStream stream = new FileStream(imageFile, FileMode.Create))
                    {
                        using (BinaryWriter writer = new BinaryWriter(stream))
                        {
                            writer.Write(image);
                            writer.Close();
                        }
                    }
                }
            }
            catch (Exception) { /*MessageBox.Show(e.Message + ":" + e.StackTrace);*/  };
            return imageFile;
        }

        public static string getTransparentImage()
        {
            if (transparentImageFile != null)
            {
                if (File.Exists(transparentImageFile) == true)
                {
                    return transparentImageFile;
                }
            }
            string imageFile = Path.GetTempFileName();
            using (FileStream stream = new FileStream(imageFile, FileMode.Create))
            {
                using (BinaryWriter writer = new BinaryWriter(stream))
                {
                    writer.Write(global::WordAddIn.Properties.Resources.transparent);
                    writer.Close();
                }
            }
            transparentImageFile = imageFile;
            return imageFile;
        }

        public static float getMaxWidth(string display)
        {
            try
            {
                return Convert.ToInt32(display);
            }
            catch (Exception)
            {
                return -1;
            }
        }

        public static string parseValue(Dictionary<String, object> entity, string type)
        {
            object o = null;

            try
            {
                Dictionary<String, object> dict = (Dictionary<String, object>)entity["$value"];
                if (dict.ContainsKey("$value"))
                {
                    o = dict["$value"];
                }
            }
            catch (Exception)
            {
                return "";
            }
            if (o == null)
            {
                return "";
            }
            if (type != null)
            {

                if ((type.Equals("application/x-decimal") || type.Equals("application/x-quantity")) && o.GetType() == typeof(String))
                {
                    return Decimal.Parse(o.ToString(), decimalFormat).ToString();
                }
            }
            return o.ToString();
        }

        public static string parseValue(Dictionary<String, object> entity, string type, string display)
        {
            object o = null;

            try
            {
                o = ((Dictionary<String, object>)entity["$value"])[display];
            }
            catch (Exception)
            {
                return "";
            }
            if (o == null)
            {
                return "";
            }
            return o.ToString();
        }
    }
}
