using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using System.Globalization;

namespace WordAddIn
{
    public enum ReportingFieldTypes {
        TEXT,
        DECIMAL,
        INTEGER,
        DATETIME,
        DATE,
        BOOL,
        CHOICE,
        IMAGE,
        COLLECTION,
        GRAPH,

        // Only used for accessing icons in layout panel
        BOX,
        TABLE
    }

    public class ReportingFieldUtil
    {
        private static CultureInfo culture = CultureInfo.CreateSpecificCulture("en-US");

        public static ReportingFieldTypes getType(String mimetype) {
            if ("application/x-string".Equals(mimetype))
                return ReportingFieldTypes.TEXT;
            if ("application/x-decimal".Equals(mimetype))
                return ReportingFieldTypes.DECIMAL;
            if ("application/x-integer".Equals(mimetype))
                return ReportingFieldTypes.INTEGER;
            if ("application/x-boolean".Equals(mimetype))
                return ReportingFieldTypes.BOOL;
            if ("application/x-choice".Equals(mimetype))
                return ReportingFieldTypes.CHOICE;
            if ("application/x-datetime".Equals(mimetype))
                return ReportingFieldTypes.DATETIME;
            if ("application/x-date".Equals(mimetype))
                return ReportingFieldTypes.DATE;
            if ("application/x-image".Equals(mimetype))
                return ReportingFieldTypes.IMAGE;
            if ("application/x-collection".Equals(mimetype))
                return ReportingFieldTypes.COLLECTION;
            if ("application/x-graph".Equals(mimetype))
                return ReportingFieldTypes.GRAPH;

            return ReportingFieldTypes.TEXT;
        }

        public static System.Drawing.Bitmap getImage(ReportingFieldTypes type)
        {
            switch (type)
            {
                case ReportingFieldTypes.TEXT:
                    return global::WordAddIn.Properties.Resources.s_author_light_string;
                case ReportingFieldTypes.DECIMAL:
                    return global::WordAddIn.Properties.Resources.s_author_light_decimale;
                case ReportingFieldTypes.INTEGER:
                    return global::WordAddIn.Properties.Resources.s_author_light_decimale;
                case ReportingFieldTypes.DATETIME:
                    return global::WordAddIn.Properties.Resources.s_author_light_datetime;
                case ReportingFieldTypes.DATE:
                    return global::WordAddIn.Properties.Resources.s_author_light_date;
                case ReportingFieldTypes.BOOL:
                    return global::WordAddIn.Properties.Resources.s_author_light_boolean;
                case ReportingFieldTypes.CHOICE:
                    return global::WordAddIn.Properties.Resources.s_author_light_choice;
                case ReportingFieldTypes.IMAGE:
                    return global::WordAddIn.Properties.Resources.s_author_light_image;
                case ReportingFieldTypes.COLLECTION:
                    return global::WordAddIn.Properties.Resources.s_author_light_collection;
                case ReportingFieldTypes.GRAPH:
                    return global::WordAddIn.Properties.Resources.s_author_light_graph;

                    // Dummy icons
                case ReportingFieldTypes.BOX:
                    return global::WordAddIn.Properties.Resources.s_author_light_vignette;
                case ReportingFieldTypes.TABLE:
                    return global::WordAddIn.Properties.Resources.s_author_light_collection;
            }
            return global::WordAddIn.Properties.Resources.s_author_light_string;
        }

        public static System.Windows.Forms.ImageList getTypeImageList()
        {
            System.Windows.Forms.ImageList il = new System.Windows.Forms.ImageList();
            foreach (ReportingFieldTypes t in System.Enum.GetValues(typeof(ReportingFieldTypes))) {
                il.Images.Add(getImage(t));
            }
            return il;
        }
        public static int getTypeImageListIndex(ReportingFieldTypes type)
        {
            System.Windows.Forms.ImageList il = new System.Windows.Forms.ImageList();
            int i = 0;
            foreach (ReportingFieldTypes t in System.Enum.GetValues(typeof(ReportingFieldTypes)))
            {
                if (t == type)
                {
                    return i;
                }
                i++;
            }
            return 0;
        }
        public static string formatValue(string value, ReportingFieldTypes type)
        {
            if (value == null || "".Equals(value))
            {
                return " ";
            }

            try
            {
                DateTime dt;
                switch (type)
                {
                    case ReportingFieldTypes.DATETIME:
                        DateTime.TryParse(value, out dt);
                        value = dt.ToString("g");
                        break;
                    case ReportingFieldTypes.DATE:
                        DateTime.TryParse(value, out dt);
                        value = dt.ToString("d");
                        break;
                    case ReportingFieldTypes.DECIMAL:
                        Decimal d = Decimal.Parse(value, culture);
                        value = d.ToString("N");
                        break;
                    case ReportingFieldTypes.INTEGER:
                        Int64 i = Int64.Parse(value, culture);
                        value = i.ToString("N");
                        break;
                    case ReportingFieldTypes.BOOL:
                        if ("false".Equals(value.ToLower()) || "0".Equals(value.ToLower()))
                        {
                            value = false.ToString();
                        }
                        else
                        {
                            value = true.ToString();
                        }
                        break;
                    default:
                        break;
                }
            }
            catch (Exception) { }

            return value;

        }
        public static bool isSupportedType(ReportingFieldTypes type) {
            if (ReportingFieldTypes.GRAPH == type)
                return false;
            return true;
        }
    }
}
