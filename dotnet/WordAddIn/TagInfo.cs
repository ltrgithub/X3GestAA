using Microsoft.Office.Interop.Word;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace WordAddIn
{
    public class TagInfo
    {
        public string tag;
        public string property;
        public string collection;
        public string display;
        public bool isSimple;
        public bool isFormula;
        public string formula;

        // Information extracted from a ContentControl tag-property
        // [display:][<entity>.]<property>
        // <entity>   only when handling collections (Name of collection property of entity)
        // <property> property whos value is to displayed
        // <display>  $title or $value (Display title or value of property) - NOT USED YET
        public static TagInfo create(ContentControl c)
        {
            try
            {
                int i;
                TagInfo t = new TagInfo();
                string tag = c.Tag;
                i = tag.IndexOf(":");
                if (i > -1)
                {
                    t.display = tag.Substring(0, i);
                    tag = tag.Substring(i + 1);
                }

                Match m = ContentControlHelper.sumRegex.Match(tag);
                if (m.Success)
                {
                    t.isFormula = true;
                    t.formula = "$sum";
                    tag = m.Groups["exp"].Value;
                }
                t.tag = tag;
                i = tag.IndexOf(".");
                if (i > -1)
                {
                    t.collection = tag.Substring(0, i);
                    t.property = tag.Substring(i + 1);
                    t.isSimple = false || t.isFormula;
                }
                else
                {
                    t.collection = "";
                    t.property = tag;
                    t.isSimple = true;
                    t.formula = null;
                    t.isFormula = false;
                }

                return t;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
